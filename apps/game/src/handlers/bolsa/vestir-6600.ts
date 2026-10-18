/**
 * Aba no jogo: Bolsa (6600) — "Figurino"/dress room, só existe no cliente 6600 (`playerDress.swf`,
 * `UIModuleTypes.PLAYER_DRESS`): salva/aplica conjuntos de roupa (até `DressModel.DRESS_LEN` modelos),
 * "dobra" (reordena) peças da bolsa de vestir, e trava a bolsa de vestir.
 *
 * COLISÃO DE CÓDIGO (não é layout, é o número do pacote em si — mesmo padrão do Detalhe D/259 e do
 * 121/RUNE_COMMAND em `research/6600/packets-m1.md`): `ddt/data/socket/ePackageType.as` define
 * `MARRYINFO_UPDATE=237` na 4.1 (editar o mural de casamento, `handlers/casamento/mural.ts`) e
 * `PLAYER_DRESS=237` no 6600 — o nome antigo nem existe mais no enum 6600 (confirmado em
 * `vendor/DDT-6600/Source/Game.Server/Game.Server.Packets/ePackageType.cs:166` vs
 * `vendor/DDTank41/Game.Server/Packets/ePackageType.cs:194`). Um cliente 6600 mandando qualquer sub-comando
 * de `PLAYER_DRESS` (`GameSocketOut.as setCurrentModel/saveDressModel/foldDressItem/lockDressBag`, sub-byte
 * `PlayerDressType` 1/2/6/7) bateria direto no handler de mural (`marryInfoUpdate`, que lê
 * `bool,string`), interpretando o 1º byte do payload do 6600 como um booleano aleatório e corrompendo
 * `Marry_Info.IsPublishEquip/Introduction` do jogador com lixo. `casamento/index.ts` despacha o código 237
 * por `clientKind` pra evitar isso: 6600 cai aqui (no-op documentado), 4.1 continua indo pro mural.
 *
 * GAP (m2-bolsa → M3): `PLAYER_DRESS` é feature NOVA do 6600, sem equivalente na 4.1 — não existe
 * `DressModel`/"modelo de figurino salvo" na `Game.Logic`/`Bussiness` da 4.1, nem tabela correspondente em
 * `packages/db` hoje. Por instrução da tarefa ("wire the 6600 packets only if the 4.1 server logic already
 * exists; otherwise document as gap for M3"), NÃO implementamos a feature aqui — só evitamos a corrupção
 * de dados do mural. Confirmado que isso é seguro fazer "nada": `playerDress.swf`/`UIModuleTypes.PLAYER_DRESS`
 * é carregado via `UIModuleLoader.addUIModuleImp` só quando o jogador abre a tela de Figurino
 * (`PlayerDressManager.loadPlayerDressModule`), NÃO faz parte do burst automático de login/hall (diferente
 * do `KING_BLESS_MAIN`/142 do Round 2, que travava o hall com `TypeError #1009` por nunca ser inicializado) —
 * então não responder deixa a tela de Figurino vazia/sem modelos salvos, sem crash em nenhum outro lugar.
 *
 * Sub-comandos (`playerDress/data/PlayerDressType.as`): 1 GET_DRESS_MODEL (salvar modelo: int index, int
 * count, count×[int bagType, int place]), 2 CURRENT_MODEL (pedir/setar modelo atual: int index — cliente
 * manda -1 quando não tem nenhum salvo ainda e já responde com `setCurrentModel(0)`+`saveDressModel(0,...)`
 * sozinho, client-side, sem exigir resposta do servidor), 6 FOLD_DRESS (reordenar: int count, count×[int
 * bagType, int fromPlace, int bagType, int toPlace] — nem o `SocketManager.playerDressHandler` 6600 tem
 * case pra isso no sentido servidor→cliente, só client→server), 7 LOCK_DRESSBAG (travar bolsa de vestir,
 * sem payload extra).
 */
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { GSPacket } from "@ddt/protocol";

/** 237 PLAYER_DRESS (6600 só): lê e descarta o sub-comando pra não deixar bytes "perdidos" confundirem
 * quem ler o log de pacotes — nenhuma lógica de jogo acontece (ver GAP no cabeçalho do arquivo). */
export function playerDressStub(_ctx: ServerContext, _p: GamePlayer, pkt: GSPacket): void {
  pkt.readByte(); // PlayerDressType sub-command — não implementado, ver GAP acima.
}
