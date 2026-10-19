/**
 * `m3-launcher-login` (docs/plan/TASKS.md): 208 `LAUNCHER_LOGIN` (`sendDeskTopLogin`,
 * `ddt/manager/GameSocketOut.as:3029`, chamado por `DesktopManager.deskTopLogin()` e
 * `HallStateView.as:1595`).
 *
 * O que é no original: `DesktopManager.as` usa `flash.external.ExternalInterface` pra perguntar ao
 * HOSPEDEIRO do SWF (o `.exe` launcher desktop original, não o navegador) "você é o launcher desktop?"
 * (`ExternalInterface.call("IsDesktop")`) e registra um callback `SetIsDesktop` que o lado nativo chama
 * de volta. **Esse flag (`_desktopType`) é inteiramente decidido pelo processo nativo que hospeda o
 * Flash Player, nunca verificado pelo servidor** — é exatamente o tipo de "flag de cliente puro" contra
 * o qual a regra do projeto avisa (nunca dar recompensa por ele). Quando `isDesktop` é true, o cliente
 * manda `sendDeskTopLogin()` (código 208, 1 int, sempre 0 — o `HallStateView.as:1595` que chama com
 * type=1 é outro fluxo, "retorno de tela" sem relação com o login).
 *
 * O que o servidor original faz com isso: **nada**. `ePackageType.cs:258` declara `LAUNCHER_LOGIN = 208`
 * (colidindo de propósito com `CARDS_SOUL = 208` no MESMO enum — `ePackageType.cs:215` — a mesma
 * colisão existe no enum do cliente, `ddt/data/socket/ePackageType.as:432` vs `:528`; confirmado que é
 * o próprio jogo original que reusa o número, não um erro desta porta). Nenhuma classe
 * `[PacketHandler(208)]` existe em `Game.Server.Packets.Client` pra NENHUM dos dois significados — e o
 * lado `CARDS_SOUL` (que seria servidor→cliente) também nunca é enviado por nenhum código do servidor
 * (grep vazio por `CardsSoul`/`GSPacketIn(208)`). Ou seja: o pacote 208 que o cliente manda ao fazer
 * login via launcher desktop é **descartado pelo próprio servidor original** — não existe bônus, não
 * existe log, não existe nada do lado de quem persiste dados.
 *
 * Nosso launcher (`apps/launcher`) nem reproduz esse contrato: é um runner Ruffle/Flash Projector, não
 * um wrapper que implementa a ponte `ExternalInterface` `IsDesktop`/`SetIsDesktop` do launcher original
 * — então mesmo se quiséssemos confiar no flag, o SWF rodando dentro do nosso launcher atual nunca
 * teria `isDesktop=true` pra disparar o envio. Se um dia quisermos dar um bônus real de "logou pelo
 * launcher", a regra do projeto exige uma prova que o SERVIDOR possa verificar (ex.: um token de sessão
 * que `apps/api` emite só pro launcher e que o cliente apresenta no LOGIN, não um booleano que o próprio
 * cliente decide) — não implementado aqui por falta dessa verificação, exatamente como a tarefa pede.
 *
 * Decisão: no-op puro, idêntico ao comportamento do servidor original (lê e descarta, sem resposta).
 * Como testar: `apps/game/test/client-6600-m3-misc-sweep.test.ts`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export function launcherLogin(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  pkt.readInt(); // type — sempre 0 no fluxo de login; nunca usado pelo servidor original
  ctx.log.debug(`208 LAUNCHER_LOGIN: noop (player=${p.id}) — descartado também no servidor original`);
}
