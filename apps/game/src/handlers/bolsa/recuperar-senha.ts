/**
 * Aba no jogo: Bolsa — recuperar a senha da bolsa (2ª senha) sem saber a senha atual, por telefone vinculado
 * ou pela pergunta secreta. Distinto de `senha-da-bolsa.ts` (25 BAG_LOCKED), que cobre o fluxo normal
 * ("eu sei a senha" / "esqueci mas sei a pergunta", tipos 1-5) — este arquivo é SÓ o menu avulso "serviço de
 * telefone" (`baglocked/phoneServiceFrames/*.as`) que a tela de bolsa travada abre quando o jogador clica
 * em "esqueci" antes mesmo de digitar qualquer senha.
 *
 * Pacote: 403 BAGLOCK_PWD — 5 sub-ações (`BaglockedPackageType.cs` 4.1 / `CrazyTankPackageType.as` 6600,
 * MESMO valor nos dois clientes, confirmado em `research/6600/coverage-m3.md`): 1 GET_BACK_BY_PHONE,
 * 2 GET_BACK_BY_QUESTION, 3 DELETE_QUESTION, 4 DELETE_PWD_BY_PHONE, 5 CHECK_PHONE_BINDING.
 *
 * C#: `BaglockedHandle.cs:10` (`vendor/DDTank41/Game.Server/Packets/Client/BaglockedHandle.cs`) só implementa
 * o sub-caso 5, retornando `true` fixo (hardcoded, nunca verifica nada) — os outros 4 caem no
 * `default: Console.WriteLine(...)`: no jogo original, telefone/apagar-pergunta nunca funcionavam (o
 * jogador clicava e a tela ficava esperando pra sempre). O porquê: as telas de telefone
 * (`PhoneInputFrame`/`PhoneConfirmFrame`/`MsnConfirmFrame`) inteiras dependem de confirmação por SMS do
 * portal chinês 4399 original (`BaglockedManager.requestConfirm` → `LoaderCreate.requestMsnConfirm`, uma
 * chamada HTTP pra API da operadora 4399) — não temos (nem nunca tivemos) esse provedor, então replicar essa
 * metade seria chutar comportamento que nunca existiu (regra do projeto: nunca chutar).
 *
 * O que portamos de verdade (não existe no original, é tudo "Reborn-only" igual o resto de `senha-da-bolsa.ts`):
 *  - 2 GET_BACK_BY_QUESTION: 100% portável sem telefone — reusa os MESMOS dados que `senha-da-bolsa.ts`
 *    (25 BAG_LOCKED tipo 1/5) já grava: `q1/a1/q2/a2` + `count` (`FailedPasswordAttemptCount`,
 *    `db/characters.ts loadBagPassword`/`updatePasswordInfo`). Sem migração nova.
 *    - step 0 (abrir): responde se a conta TEM senha+pergunta cadastradas E ainda tem tentativas (`count>0`)
 *      — "se a conta não tiver, recusar" (pedido explícito da tarefa) sai exatamente daqui.
 *    - step 1 (responder): as 2 respostas têm que bater as duas, exatas (comparação igual à de tipo 4 de
 *      `senha-da-bolsa.ts`). Acerto: LIMPA a senha (`updatePasswordTwo(db,id,"")`, mesma ação de "esqueci a
 *      senha" que o tipo 4 de BAG_LOCKED já faz — não é enfraquecer, é zerar pra forçar o jogador a definir
 *      uma nova pelo fluxo normal tipo 1) e devolve o orçamento de tentativas pra 5. Erro: decrementa `count`
 *      (nunca passa de 0 — chão explícito, o original de BAG_LOCKED tipo 3/4 deixava ir negativo; aqui é
 *      pedido explícito "rate-limit attempts", então corrigimos o chão) e recusa de novo quando esgotado.
 *  - 1/4 (telefone) e 3 (apagar pergunta, que no original também depende do SMS 4399 pra confirmar): sem
 *    nenhum dado de telefone no banco (nunca existiu). Responde sempre "não tem telefone/esse recurso ainda"
 *    (`flag=false`) — recusa HONESTA (não é bypass, nem chute de SMS falso): a UI já sabe lidar com
 *    `flag=false` nesses sub-casos (não avança tela nenhuma, só fica no menu). Se telefone vinculado for
 *    portado um dia, é só trocar esse `false` fixo por uma leitura real.
 *  - 5 CHECK_PHONE_BINDING: mesma ideia, mas CORRIGE o hardcode `true` do original pra `false` — no original
 *    a mentira era inofensiva (nada mais ali funcionava mesmo); aqui faz diferença de verdade porque a UI
 *    usa esse flag pra decidir a tela (`BaglockedManager.as:73` desabilita o botão "serviço de telefone",
 *    `:92` manda pra "vincular telefone" em vez de abrir uma recuperação por SMS que não existe).
 *
 * Segurança (pedido explícito da tarefa, nada disso existe no original porque o original não funcionava):
 *  - Nunca devolve a pergunta/resposta salva na rede, só confirma se bate.
 *  - Cooldown de 3s por conexão nas sub-ações 1-4 (mesmo valor do cooldown de `senha-da-bolsa.ts` tipo 3/4) —
 *    rate-limit contra brute-force da pergunta secreta. `5 CHECK_PHONE_BINDING` fica de fora do cooldown
 *    porque é só uma consulta de estado, chamada toda vez que a telinha de explicação abre
 *    (`BagLockedController.onShow` case 0) — não é uma tentativa de recuperação.
 *  - `count` nunca passa de 0 (chão, diferente do original) — esgotado, só reseta no sucesso (que também
 *    exige acertar as 2 respostas) ou setando a pergunta de novo pelo fluxo normal tipo 1/5.
 *  - Sucesso só LIMPA a senha, nunca define uma nova nem devolve a antiga nem desliga a exigência "pra
 *    sempre" (o jogador ainda precisa passar pelo tipo 1 de BAG_LOCKED pra definir outra).
 * Como testar: `apps/game/test/client-6600-m3-baglock-recovery.test.ts`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";
import { loadBagPassword, updatePasswordInfo, updatePasswordTwo } from "../../db/characters.js";

/** BaglockedPackageType.cs / CrazyTankPackageType.as — mesmo valor nos dois clientes. */
const CMD = {
  GET_BACK_BY_PHONE: 1,
  GET_BACK_BY_QUESTION: 2,
  DELETE_QUESTION: 3,
  DELETE_PWD_BY_PHONE: 4,
  CHECK_PHONE_BINDING: 5,
} as const;

/** 3s cooldown per connection on recovery sub-actions (1-4) — own budget, separate from BAG_LOCKED's. */
const lastRecoveryAttempt = new WeakMap<object, number>();
function onCooldown(p: object): boolean {
  const t = Date.now();
  if (t - (lastRecoveryAttempt.get(p) ?? 0) < 3000) return true;
  lastRecoveryAttempt.set(p, t);
  return false;
}

export function registerRecuperarSenha(r: HandlerRegistry): void {
  r.player(403, "BAGLOCK_PWD", async (ctx: ServerContext, p: GamePlayer, pkt) => {
    const cmd = pkt.readByte();
    const out = new GSPacket(403, p.id);

    if (cmd === CMD.CHECK_PHONE_BINDING) {
      out.writeByte(cmd);
      out.writeBoolean(false); // honest: no phone-binding system exists (see header — original hardcoded `true`, meant nothing there)
      return p.send(out);
    }

    const step = pkt.readInt();
    const str1 = pkt.readString();
    const str2 = cmd === CMD.GET_BACK_BY_QUESTION ? pkt.readString() : "";
    if (onCooldown(p)) return;

    if (cmd === CMD.GET_BACK_BY_PHONE || cmd === CMD.DELETE_PWD_BY_PHONE || cmd === CMD.DELETE_QUESTION) {
      // No phone-binding data exists (never did, see header) — honest refusal, same shape the client already handles.
      out.writeByte(cmd); out.writeInt(step); out.writeBoolean(false);
      return p.send(out);
    }

    // cmd === GET_BACK_BY_QUESTION
    const cur = await loadBagPassword(ctx.db.db, p.id);
    const hasQuestion = !!(cur.passwordTwo && cur.q1 && cur.a1 && cur.q2 && cur.a2);

    if (step === 0) {
      out.writeByte(cmd); out.writeInt(0);
      const ok = hasQuestion && cur.count > 0;
      out.writeBoolean(ok);
      if (ok) out.writeInt(cur.count);
      return p.send(out);
    }

    // step 1: validate the 2 typed answers (str1/str2)
    out.writeByte(cmd); out.writeInt(1);
    if (!hasQuestion || cur.count <= 0) {
      out.writeBoolean(false); out.writeInt(Math.max(cur.count, 0));
      return p.send(out);
    }
    if (cur.a1 === str1 && cur.a2 === str2) {
      await updatePasswordTwo(ctx.db.db, p.id, "");
      await updatePasswordInfo(ctx.db.db, p.id, cur.q1, cur.a1, cur.q2, cur.a2, 5);
      p.info.IsLocked = false; p.info.HasBagPassword = false; p.info.FailedPasswordAttemptCount = 5;
      out.writeBoolean(true);
    } else {
      const count = Math.max(cur.count - 1, 0);
      await updatePasswordInfo(ctx.db.db, p.id, cur.q1, cur.a1, cur.q2, cur.a2, count);
      p.info.FailedPasswordAttemptCount = count;
      out.writeBoolean(false); out.writeInt(count);
    }
    p.send(out);
  });
}
