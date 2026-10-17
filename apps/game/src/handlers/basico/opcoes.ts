/**
 * Aba no jogo: Configurações › opções (bitmask de som/chat/etc., o cliente que interpreta os bits).
 * Pacotes: 64 OPTION_UPDATE.
 * C#: `OptionHandler.cs` (`[PacketHandler(64, ...)]`, `client.Player.PlayerCharacter.OptionOnOff =
 * packet.ReadInt(); return 0;` — não vem no `vendor/DDTank41` mas existe igual no build de referência
 * DDT-6600, `vendor/DDT-6600/Source/Game.Server/Game.Server.Packets.Client/OptionHandler.cs`; o mesmo
 * campo (`SqlDataProvider/Data/PlayerInfo.cs:1401 OptionOnOff`, escrito no login por
 * `AbstractPacketLib.cs:796`) existe igual no DDTank41, só falta o arquivo do handler de entrada lá).
 * Cliente: `GameSocketOut.as:1829 sendOpition(int)` — um int único, o bitmask de opções. Sem pacote de
 * resposta no original; `OptionOnOff` já está em `SAVED_DETAIL_COLUMNS` (player-info.ts), então só
 * gravar aqui já é suficiente pra persistir no próximo save.
 * Como testar: `apps/game/test/*` (persistência). Manual: Configurações → mudar som/chat.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";

/**
 * 64 OPTION_UPDATE.
 * Como lê esse código (cada variável):
 * - value: o int único do pacote — bitmask de opções do cliente (o servidor só guarda o inteiro, quem
 *   interpreta os bits é o próprio cliente ao reabrir).
 */
export function optionUpdate(p: GamePlayer, pkt: GSPacket): void {
  p.info.OptionOnOff = pkt.readInt();
}
