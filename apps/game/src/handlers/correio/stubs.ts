/**
 * Aba no jogo: sem tela própria — pacote morto no C# original.
 * Pacotes: 214 USER_RELOAD_GIFT.
 * C#: `GameSocketOut.sendReloadGift` (sem corpo), disparado por `MailManager.__responseMail` quando a
 * 117 MAIL_RESPONSE chega com `type == 4` (`vendor/DDTank41/Source Flash/src/email/manager/
 * MailManager.as:617`). Confirmado morto no original: não existe nenhuma classe `[PacketHandler(214, ...)]`
 * em `vendor/DDTank41/Game.Server/Packets/Client/*.cs` (só a entrada 214 em ePackageType.cs) — o servidor
 * de origem nunca respondia a esse pacote; o cliente só reenvia 218 USER_GET_GIFTS (já em bolsa/) se o
 * servidor responder true, o que nunca acontecia. Registrado como stub (consome, não responde) em vez de
 * deixar MISSING, igual a 25 POLL_CANDIDATE em sociedade/votacao.ts.
 */

/** 214 USER_RELOAD_GIFT — sem corpo, nada pra ler. */
export function userReloadGift(): void {}
