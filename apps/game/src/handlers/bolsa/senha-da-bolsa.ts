/**
 * Aba no jogo: Bolsa — senha da bolsa (2ª senha pra proteger Forja/inventário contra hackeamento de conta).
 * Pacote: 25 BAG_LOCKED. Exporta também `bagLocked()`, a checagem usada por outras ações sensíveis da
 * bolsa e da loja (reciclar, comprar, usar prop...) antes de deixar a ação passar.
 * C#: recurso Reborn-only (o C# original não tinha; `PassWordTwoHandle.cs:861` é a referência de formato
 * do pacote que esse handler imita).
 * Como testar: sem teste automatizado dedicado ainda (cobertura indireta via `forge-persist.test.ts`,
 * que testa `bagLocked`). Manual: `docs/features/login-conta.md` §3 tem o passo a passo.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";
import { loadBagPassword, updatePasswordInfo, updatePasswordTwo } from "../../db/characters.js";

/**
 * Trava de senha da bolsa no jogo: bloqueia a ação (Forja, reciclar, comprar...) enquanto
 * `HasBagPassword && IsLocked`. Chamada no início de toda ação sensível, nunca dentro de `mover.ts`
 * (mover item entre slots não é bloqueado pela senha, só ações que "gastam" algo).
 * Pacote: não lê nem responde pacote; só envia mensagem `0` com string exata `"Bag.Locked"` e retorna `true`.
 * Contrapartida C#: checagem `HasBagPassword/IsLocked` usada pelos handlers sensíveis antes de agir
 * (ex. `PropBuyHandler.cs:42`).
 */
export function bagLocked(ctx: ServerContext, p: GamePlayer): boolean {
  if (p.info.HasBagPassword && p.info.IsLocked) {
    p.sendMessage(0, ctx.lang.t("Bag.Locked"));
    return true;
  }
  return false;
}

/** Per-connection 3s cooldown for BAG_LOCKED cases 3/4 (client.Player.WaitingProcessor), like basic.ts's lastSave. */
const lastBagLockedAttempt = new WeakMap<object, number>();

function onCooldown(p: object): boolean {
  const t = Date.now();
  if (t - (lastBagLockedAttempt.get(p) ?? 0) < 3000) return true;
  lastBagLockedAttempt.set(p, t);
  return false;
}

/**
 * PassWordTwoHandle.cs:861 (25 BAG_LOCKED): 5 sub-cases sharing one reply shape (int userId, int reType, bool
 * result, bool addInfo, str msg, int count, str q1, str q2).
 *   1 = set the password (+ optionally the recovery Q&A) — only if none is set yet.
 *   2 = unlock for this session (check password).
 *   3 = change the password via the current one (3s cooldown).
 *   4 = recover (forgot password) via the recovery Q&A, clears the password (3s cooldown).
 *   5 = set/replace just the recovery Q&A.
 *
 * Como lê esse código (cada variável):
 * - passwordTwo/passwordTwoNew: senha atual / nova (texto puro, como no original — sem hash).
 * - type: qual dos 5 sub-casos. q1/a1/q2/a2: pergunta+resposta de recuperação (só usadas nos casos 1 e 5).
 * - cur: o que já está salvo no banco (loadBagPassword) — comparação sempre contra isso, nunca contra `p.info`.
 */
export function registerSenhaDaBolsa(r: HandlerRegistry): void {
  r.player(25, "BAG_LOCKED", async (ctx, p, pkt) => {
    const passwordTwo = pkt.readString();
    const passwordTwoNew = pkt.readString();
    const type = pkt.readInt();
    const q1 = pkt.readString();
    const a1 = pkt.readString();
    const q2 = pkt.readString();
    const a2 = pkt.readString();

    let msg = "BAG LOCK FAIL";
    let result = false;
    let reType = 0;
    let addInfo = false;
    let count = 0;
    let q1Out = q1, q2Out = q2; // overwritten below for type 3/4, mirroring GetPasswordInfo's `ref` params
    const cur = await loadBagPassword(ctx.db.db, p.id);

    if (type === 1) {
      reType = 1;
      if (!cur.passwordTwo) {
        if (passwordTwo !== "" && (await updatePasswordTwo(ctx.db.db, p.id, passwordTwo))) {
          p.info.HasBagPassword = true;
          p.info.IsLocked = false;
          msg = "SetPassword.success";
        }
        if (q1 !== "" && a1 !== "" && q2 !== "" && a2 !== "") {
          if (await updatePasswordInfo(ctx.db.db, p.id, q1, a1, q2, a2, 5)) {
            p.info.PasswordQuest1 = q1; p.info.PasswordQuest2 = a1; p.info.FailedPasswordAttemptCount = 5;
            result = true; msg = "UpdatePasswordInfo.Success";
          }
        } else { result = true; addInfo = true; }
      } else { msg = "SetPassword.Fail"; }
    } else if (type === 2) {
      reType = 2;
      if (passwordTwo === cur.passwordTwo) { p.info.IsLocked = false; msg = "BagUnlock.success"; result = true; }
      else msg = "PasswordTwo.error";
    } else if (type === 3) {
      if (onCooldown(p)) return;
      reType = 3;
      count = cur.count - 1;
      q1Out = cur.q1; q2Out = cur.q2;
      await updatePasswordInfo(ctx.db.db, p.id, cur.q1, cur.a1, cur.q2, cur.a2, count);
      if (passwordTwo === cur.passwordTwo) {
        if (await updatePasswordTwo(ctx.db.db, p.id, passwordTwoNew)) { p.info.IsLocked = false; msg = "UpdatePasswordTwo.Success"; result = true; }
        else msg = "UpdatePasswordTwo.Fail";
      } else msg = "PasswordTwo.error";
    } else if (type === 4) {
      if (onCooldown(p)) return;
      reType = 4;
      count = cur.count - 1;
      q1Out = cur.q1; q2Out = cur.q2;
      await updatePasswordInfo(ctx.db.db, p.id, cur.q1, a1, cur.q2, a2, count); // original re-saves Q1/Q2 as read, A1/A2 as typed by the player
      if (cur.a1 && cur.a2 && cur.a1 === a1 && cur.a2 === a2) {
        if (await updatePasswordTwo(ctx.db.db, p.id, "")) { p.info.IsLocked = false; p.info.HasBagPassword = false; msg = "DeletePassword.success"; result = true; }
        else msg = "DeletePassword.Fail";
      } else if (passwordTwo === cur.passwordTwo) {
        if (await updatePasswordTwo(ctx.db.db, p.id, "")) { p.info.IsLocked = false; p.info.HasBagPassword = false; msg = "DeletePassword.success"; result = true; }
        else msg = "DeletePassword.Fail";
      } else msg = "DeletePassword.Fail";
    } else if (type === 5) {
      reType = 5;
      if (cur.passwordTwo && q1 !== "" && a1 !== "" && q2 !== "" && a2 !== "") {
        if (await updatePasswordInfo(ctx.db.db, p.id, q1, a1, q2, a2, 5)) { result = true; msg = "UpdatePasswordInfo.Success"; }
      }
    }

    const out = new GSPacket(25, p.id);
    out.writeInt(p.id); out.writeInt(reType); out.writeBoolean(result); out.writeBoolean(addInfo);
    out.writeString(ctx.lang.t(msg)); out.writeInt(count); out.writeString(q1Out); out.writeString(q2Out);
    p.send(out);
  });
}
