/**
 * Aba no jogo: índice do Correio inteiro — marcar lida, apagar, resgatar anexo, enviar, cancelar pagamento
 * pendente. Cada ação tem o seu próprio arquivo:
 *
 *   comum.ts               (sem tela própria, acesso a carta + anexo compartilhado)
 *   marcar-lida.ts         (Correio › abrir carta)          — 114 UPDATE_MAIL
 *   apagar.ts              (Correio › apagar carta)          — 112 DELETE_MAIL
 *   resgatar-anexo.ts      (Correio › resgatar anexo)        — 113 GET_MAIL_ATTACHMENT
 *   enviar.ts              (Correio › escrever carta)        — 116 SEND_MAIL
 *   cancelar-pagamento.ts  (Correio › cancelar COD enviado)   — 118 MAIL_CANCEL
 *   stubs.ts               (sem tela própria, pacote morto)   — 214 USER_RELOAD_GIFT
 *
 * Pacotes: ver tabela acima. C#: `Game.Server/Packets/Client/*.cs` (ver cabeçalho de cada arquivo).
 * A lista de cartas é HTTP (`apps/api`), fora deste módulo.
 * Como testar: `apps/game/test/mail.test.ts`, `apps/game/test/persist-all.test.ts`.
 * Manual: `docs/features/correio.md`.
 */
import type { HandlerRegistry } from "../registry.js";
import { updateMail } from "./marcar-lida.js";
import { deleteMail } from "./apagar.js";
import { getAttachment } from "./resgatar-anexo.js";
import { sendMailPacket } from "./enviar.js";
import { mailCancel } from "./cancelar-pagamento.js";
import { userReloadGift } from "./stubs.js";

export function registerCorreio(r: HandlerRegistry): void {
  r.player(114, "UPDATE_MAIL", updateMail);
  r.player(112, "DELETE_MAIL", deleteMail);
  r.player(113, "GET_MAIL_ATTACHMENT", getAttachment);
  r.player(116, "SEND_MAIL", sendMailPacket);
  // 214 USER_RELOAD_GIFT: pacote morto confirmado no C# original (ver stubs.ts) — noop é fiel, não pendência;
  // "implemented" (41-stubs-rates), não "stub".
  r.player(214, "USER_RELOAD_GIFT", userReloadGift);
  r.player(118, "MAIL_CANCEL", mailCancel);
}
