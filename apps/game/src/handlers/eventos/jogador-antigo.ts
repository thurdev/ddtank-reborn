/**
 * Aba no jogo (6600): botão "Jogador antigo" que aparece ao lado do e-mail no hall (`PlayerTool.as`
 * `_oldPlayerBtn`, condicionado a `_selfInfo.isOld`) — `oldPlayerRegress/` (`RegressView`/`RegressMenuView` e
 * as abas `WelcomeView`/`AreaView`/`call/CallView`/`packs/PacksView`) — 149 OLDPLAYER_REGRESS, 11 sub-ações
 * (`RegressPackageType`, `ddt/data/socket/RegressPackageType.as`).
 *
 * `IsOldPlayer`/`LastDate` (m3-eventos-b): a elegibilidade "jogador antigo" é um FATO do banco
 * (`player."Sys_Users_Detail"."IsOldPlayer"`, SqlDataProvider/Data/PlayerInfo.cs), nunca algo que o cliente
 * declara. `applyOldPlayerLogin` roda no burst de login (session/login.ts, ANTES de `Out.loginSuccess`) e:
 *   1. mede a inatividade REAL = agora − `LastDate` como estava gravado ANTES deste login (ou seja, o fim da
 *      sessão anterior — `LastDate` nunca era atualizado no servidor TS antes desta tarefa, o que deixava o
 *      valor congelado desde a criação do personagem; agora também é regravado pra `now()` aqui, pra que o
 *      PRÓXIMO login meça a partir desta sessão, igual o C# original faz via SP de login);
 *   2. se >= `inactiveDays` (admin, `app."ScheduledEvents"` kind `oldplayer-regress`, default 15 dias — sem
 *      data fixa, só duração configurável) E ainda não é `IsOldPlayer`, vira `true` (flag "liga uma vez",
 *      nunca volta a `false` sozinha — mesma semântica do C#: só round-trip de um bool persistido, sem reset
 *      automático visível no código decompilado).
 * `IsOldPlayer`/`LastDate` já estavam em `SAVED_DETAIL_COLUMNS` (sem migração nova) — só não eram usados.
 * Esse mesmo flag alimenta o campo `isOld` (antes stub `false` com comentário errado "card-soul") em
 * `packets/out.ts`: `loginSuccess` (1), `sceneAddPlayer` (18), `roomPlayerAdd` (94/4), `addFriend` (160/160).
 *
 * `OldPlayerRegressHandler.cs` original é um no-op TOTAL pra QUALQUER sub-ação (só `packet.ReadByte()`, sem
 * switch, sem resposta nenhuma) — as 11 sub-ações nunca funcionaram no servidor 6600 decompilado. Portado a
 * partir do contrato AS3 (igual `m3-everyday-active`), com estas simplificações DOCUMENTADAS (sem exploit,
 * nunca pior que o original — que não dava nada a ninguém):
 *  - sub 0 PACKS / 1 GETPACKS (`PacksView.as __getPacksInfo`, 15 "dias" de recompensa em bundle, por tabela
 *    JAMAIS referenciada em nenhum `.cs` do vendor nem em nenhum catalog.json extraído — `Old_Player_Award_Info`
 *    (27 linhas) existe no banco mas não aparece em NENHUM consumidor C#, então usá-la aqui seria inventar uma
 *    correspondência dia→recompensa que não existe em lugar nenhum) — respondidos com o envelope correto
 *    (byte a byte, pro cliente não desincronizar/crashar) mas SEM nenhum item configurado (15 slots "já
 *    recebidos", 0 itens cada): sem recompensa inventada, sem claim possível, zero superfície de exploit.
 *  - sub 2 CHECK / 4 CALL (`CallView`/`IMListView`): sem bundle de item algum (o AS3 original também não
 *    manda nada além de 1 int de status) — só verifica cota "1 chamada por jogador, pra sempre" (`claimOnce`)
 *    e se o alvo (deve ser amigo aceito) também é `IsOldPlayer`; a notificação de verdade pro outro jogador é
 *    um `.ashx` externo (`callBackInterfacePath`) disparado pelo PRÓPRIO cliente, fora do escopo deste pacote.
 *  - sub 3 APPLYPACKS / 6 APPLY_ENABLE (`AreaView`): opt-in puro, sem item/moeda — `claimOnce` 1x por conta.
 *  - sub 5 REVCPACKS (`PlayerTool.as`, decide se mostra o botão): mesmo cálculo de elegibilidade.
 *  - sub 7/8/9/10 (ticket "chamada de volta"/loja de pontos "Integral"): sem NENHUMA tabela de moeda/preço em
 *    todo o catálogo extraído (nem `Ticket`, nem `Integral`, grep vazio) — a UI consumidora (`GetTicketView`/
 *    `IntegralShopView`) também nunca mostra uma lista real (sem fonte de dados liga). No-op (lê e descarta os
 *    campos extras, sem resposta), igual ao `OldPlayerRegressHandler.cs` original pra estas sub-ações também.
 * Como testar: `apps/game/test/client-6600-m3-oldplayer-regress.test.ts`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { claimOnce, hasClaim } from "../../game/events.js";
import { loadPlayerInfo } from "../../db/characters.js";
import { isOpen, num } from "./agendador.js";

const KIND = "oldplayer-regress";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Threshold (days) configurable by the admin via app."ScheduledEvents" kind "oldplayer-regress" (params.inactiveDays). */
function inactiveDaysThreshold(ctx: ServerContext): number {
  return Math.max(1, num(ctx, KIND, "inactiveDays", 15));
}

/**
 * GamePlayer.LoadFromDatabase / Login (SqlDataProvider PlayerInfo.IsOldPlayer): computes real inactivity from
 * the PREVIOUS session's `LastDate` (loaded from DB, not yet overwritten) before bumping it to `now`. Must run
 * BEFORE `Out.loginSuccess`/`sceneAddPlayer`/`roomPlayerAdd`/`addFriend` are built for this login.
 */
export function applyOldPlayerLogin(ctx: ServerContext, p: GamePlayer): void {
  const c = p.info;
  const now = ctx.now();
  const previousLastDate = c.LastDate;
  if (!c.IsOldPlayer) {
    const inactiveMs = now.getTime() - previousLastDate.getTime();
    if (inactiveMs >= inactiveDaysThreshold(ctx) * MS_PER_DAY) c.IsOldPlayer = true;
  }
  c.LastDate = now; // next login's gap is measured from this session (was never advanced before this task)
}

/** AreaView "apply" opt-in: available once per account, only while `IsOldPlayer` and the feature is open. */
async function applyAvailable(ctx: ServerContext, p: GamePlayer): Promise<boolean> {
  if (!p.info.IsOldPlayer || !isOpen(ctx, KIND)) return false;
  return !(await hasClaim(ctx.db.db, p.id, KIND, "apply"));
}

/** CallView/IMListView "call a friend back": 1 call per account, ever (RegressData.isCallEnable, global flag). */
async function callAvailable(ctx: ServerContext, p: GamePlayer): Promise<boolean> {
  if (!p.info.IsOldPlayer || !isOpen(ctx, KIND)) return false;
  return !(await hasClaim(ctx.db.db, p.id, KIND, "call"));
}

// ------------------------------------------------------------------ 0 PACKS / 1 GETPACKS (PacksView.__getPacksInfo)
/**
 * Envelope real (dayNum/length/15x[isRecv:byte, propsCount:int]) sem nenhum item configurado — ver nota de
 * robustez no topo do arquivo (sem tabela dia→recompensa confirmada em lugar nenhum do C#). `sendRegressPkg`
 * (sub 0) e `sendRegressGetAwardPkg` (sub 1) respondem com o MESMO formato sub-byte 0 — o próprio AS3
 * (`__onGetAwardClick`) volta a escutar `REGRESS_PACKS`, não um evento dedicado pro "ack" de 1.
 */
function sendPacksStatus(p: GamePlayer): void {
  const out = new GSPacket(149, p.id);
  out.writeByte(0);
  out.writeInt(1); // dayNum (sem calendário real pra calcular um valor melhor, ver nota)
  out.writeInt(6); // length (sobrescrito pelo próprio cliente pra 6 — PacksView.as:74 — valor irrelevante)
  for (let i = 0; i < 15; i++) {
    out.writeByte(1); // isRecv = já recebido (nunca há nada pra reivindicar, ver nota de robustez)
    out.writeInt(0); // propsNum/len = 0 itens (vale pros dois ramos de leitura do cliente, ver nota)
  }
  p.send(out);
}

// ------------------------------------------------------------------ 5 REVCPACKS (PlayerTool.__onRegressRecvPacks -> RegressData.recvPacksInfo)
async function sendRecvPacksStatus(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const [apply, call] = await Promise.all([applyAvailable(ctx, p), callAvailable(ctx, p)]);
  const pending = apply || call; // só mostra o botão/ícone enquanto houver uma ação real disponível
  const out = new GSPacket(149, p.id);
  out.writeByte(5);
  out.writeInt(call ? 0 : 1); // isCallEnable (invertido: 0 = habilitado)
  out.writeInt(apply ? 0 : 1); // isApplyEnable (invertido: 0 = habilitado)
  out.writeInt(1); // dayNum (ver sendPacksStatus)
  out.writeInt(1); // length do array de "recebido" abaixo
  out.writeByte(pending ? 0 : 1); // 0 em qualquer posição -> isOver=false (mantém o botão visível)
  p.send(out);
}

// ------------------------------------------------------------------ 6 APPLY_ENABLE (AreaView.__onApplyEnable)
async function sendApplyEnable(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const enabled = await applyAvailable(ctx, p);
  const out = new GSPacket(149, p.id);
  out.writeByte(6);
  out.writeInt(enabled ? 0 : 1); // num==1 -> desabilita o botão no cliente
  p.send(out);
}

// ------------------------------------------------------------------ 3 APPLYPACKS (AreaView.__onApplyPacks)
async function applyPacks(ctx: ServerContext, p: GamePlayer): Promise<void> {
  if (await applyAvailable(ctx, p)) await claimOnce(ctx.db.db, p.id, KIND, "apply"); // opt-in puro, sem item/moeda
  const out = new GSPacket(149, p.id);
  out.writeByte(3);
  out.writeInt(1); // sempre desabilita o botão (aplicado agora, ou já não havia nada a aplicar)
  p.send(out);
}

// ------------------------------------------------------------------ 2 CHECK (CallView.__onCheck)
async function checkPlayer(ctx: ServerContext, p: GamePlayer, _playerName: string): Promise<void> {
  // A UI de resultado de busca (CallLookUpView) nunca foi concluída no cliente original (lista sempre vazia) —
  // o único efeito observável é desabilitar o botão quando a cota de 1 chamada já foi usada.
  const usedUp = !(await callAvailable(ctx, p));
  const out = new GSPacket(149, p.id);
  out.writeByte(2);
  out.writeInt(usedUp ? 1 : 0);
  p.send(out);
}

// ------------------------------------------------------------------ 4 CALL (IMListView.__onRegressCallApply)
async function callFriend(ctx: ServerContext, p: GamePlayer, targetId: number): Promise<void> {
  const out = new GSPacket(149, p.id);
  out.writeByte(4);
  const isFriend = p.friends.get(targetId) === 1;
  let ok = false;
  if (isFriend && (await callAvailable(ctx, p))) {
    // Jogador online: usa o estado vivo (pode ter virado `IsOldPlayer` nesta MESMA sessão, antes de qualquer
    // save); offline: lê do banco.
    const online = ctx.world.get(targetId);
    const targetIsOld = online ? online.info.IsOldPlayer : (await loadPlayerInfo(ctx.db.db, targetId))?.IsOldPlayer;
    if (targetIsOld) {
      await claimOnce(ctx.db.db, p.id, KIND, "call");
      ok = true;
    }
  }
  // callID != 1 no AS3 dispara o .ashx externo (callBackInterfacePath, fora deste pacote) e desabilita o botão.
  out.writeInt(ok ? 0 : 1);
  p.send(out);
}

// ------------------------------------------------------------------ 149 OLDPLAYER_REGRESS (sub-router)
export function oldPlayerRegressHandler(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void | Promise<void> {
  const sub = pkt.readByte();
  switch (sub) {
    case 0: return void sendPacksStatus(p); // REGRESS_PACKS
    case 1: { pkt.readInt(); return void sendPacksStatus(p); } // REGRESS_GETPACKS(awardID) — sem item real, ver nota
    case 2: return checkPlayer(ctx, p, pkt.readString()); // REGRESS_CHECK(playerName)
    case 3: return applyPacks(ctx, p); // REGRESS_APPLYPACKS
    case 4: return callFriend(ctx, p, pkt.readInt()); // REGRESS_CALL(id)
    case 5: return sendRecvPacksStatus(ctx, p); // REGRESS_REVCPACKS
    case 6: return sendApplyEnable(ctx, p); // REGRESS_APPLY_ENABLE
    case 7: return; // REGRESS_GET_TICKET — sem tabela de "ticket", no-op (ver nota)
    case 8: return; // REGRESS_GET_TICKETINFO — idem
    case 9: return; // REGRESS_UPDATE_INTEGRAL — sem tabela de loja de pontos, no-op (ver nota)
    case 10: { pkt.readInt(); pkt.readInt(); return; } // REGRESS_INTEGRAL_BUY(id,num) — idem
    default: ctx.log.debug(`149 OLDPLAYER_REGRESS: sub ${sub} not handled (player=${p.id})`);
  }
}
