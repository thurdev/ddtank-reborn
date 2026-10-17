/**
 * Aba no jogo: Especial › Đại chiến Hút Gà — clicar num bichinho pra começar a "inalar" (capturar),
 * desistir no meio, ou reportar a pontuação final quando termina de capturar.
 * Pacotes: 166 LITTLEGAME_COMMAND sub 65 CLICK, sub 66 CANCEL_CLICK, sub 64 REPORT_SCORE.
 * C#: `LittleGame/Handle/Click.cs`, `CancelClick.cs`, `ReportScore.cs`, `LittleGame/Objects/Bogu.cs`
 * (`Сaught` setter + `Escaping`).
 * Nota de segurança herdada do original: quem calcula a pontuação final (`REPORT_SCORE`) é o CLIENTE —
 * o servidor só soma o valor que ele mandar (`GamePlayer.AddScore`, sem validar contra HP/tempo de
 * clique). Igual ao C# (nenhuma correção aplicada aqui: é o próprio design do minigame original).
 * Como testar: `apps/game/test/littlegame.test.ts`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { Bogu, littleGameMgr } from "./mgr.js";

/** sub 65 CLICK: `key` = id do bichinho; `(num,num2)` = posição dele (como o cliente vê);
 *  `(num3,num4)` = posição de quem clicou — usados só pra calcular a direção que os dois ficam
 *  virados um pro outro (`Click.cs`: 4 quadrantes; se `num === num3` nenhum dos 4 bate e a direção
 *  anterior é mantida — preservado tal e qual). */
export function click(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const key = pkt.readInt();
  const num = pkt.readInt();
  const num2 = pkt.readInt();
  const num3 = pkt.readInt();
  const num4 = pkt.readInt();
  const m = littleGameMgr(ctx);
  const target = m.scenario.get(key);
  if (!(target instanceof Bogu)) return; // não existe (já foi pego) ou o id é de outro jogador
  const bogu = target;
  if (bogu.caught && bogu.catchers.length >= bogu.maxCatchers) return; // grupo já completo

  const s = m.st(p);
  let dir: string | null = null;
  let isBack = false;
  if (num > num3 && num2 >= num4) { dir = "rightDown"; isBack = false; }
  else if (num > num3 && num2 < num4) { dir = "rightUp"; isBack = true; }
  else if (num < num3 && num2 >= num4) { dir = "leftDown"; isBack = false; }
  else if (num < num3 && num2 < num4) { dir = "leftUp"; isBack = true; }
  if (dir) { s.direction = dir; s.isBack = isBack; bogu.direction = dir; bogu.isBack = isBack; }

  bogu.x = num; bogu.y = num2;
  m.setCaught(bogu, true); // dispara o broadcast "livingInhale" do bichinho (+ timer de escape se pequeno/médio)
  bogu.catchers.push(p);
  s.bogu = bogu;
  m.playerAction(p, "livingInhale"); // broadcast "livingInhale" do próprio jogador

  if (bogu.size < 2) m.sendAddObject(p, bogu, "normalbogu"); // pequeno/médio: HUD de clique sozinho
  else if (bogu.catchers.length < bogu.maxCatchers) m.sendAddObject(p, bogu, "bogugiveup"); // grande/gigante: grupo incompleto, pode desistir
  else for (const c of bogu.catchers) m.sendAddObject(c, bogu, "bigbogu"); // grupo completo: manda o HUD pra todo mundo
}

/** sub 66 CANCEL_CLICK: desistiu de capturar antes de terminar (`CancelClick.cs`). */
export function cancelClick(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const key = pkt.readInt();
  const m = littleGameMgr(ctx);
  const target = m.scenario.get(key);
  if (target !== undefined && !(target instanceof Bogu)) {
    m.releaseInhale(p);
    p.sendMessage(0, "Oh yeah... já foi capturado.");
    return;
  }
  if (target instanceof Bogu) {
    const bogu = target;
    const i = bogu.catchers.indexOf(p);
    if (i >= 0) bogu.catchers.splice(i, 1);
    m.releaseInhale(p);
    if (bogu.catchers.length === 0) {
      bogu.caught = false;
      m.boguAction(bogu, "livingUnInhale");
    }
    return;
  }
  m.releaseInhale(p); // bichinho já não existe mais no mundo
}

/** sub 64 REPORT_SCORE: terminou de capturar — `value` (pontos, calculado pelo cliente) + `key`
 *  (id do bichinho). Some o último capturador esvazia o grupo → remove o bichinho do mundo
 *  (`ReportScore.cs`). */
export function reportScore(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const value = pkt.readInt();
  const key = pkt.readInt();
  const m = littleGameMgr(ctx);
  const target = m.scenario.get(key);
  if (target instanceof Bogu) {
    const bogu = target;
    const i = bogu.catchers.indexOf(p);
    if (i >= 0) bogu.catchers.splice(i, 1);
    if (bogu.catchers.length === 0) {
      m.boguAction(bogu, "livingDie");
      m.removeBogu(bogu);
    }
    p.addScore(value);
    m.releaseInhale(p);
    return;
  }
  m.releaseInhale(p);
}
