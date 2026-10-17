/**
 * Aba no jogo: sem tela própria — pacote morto em AMBOS os lados do 4.1 base.
 * Pacotes: 167 CHURCH_MOVIE_OVER (notícia de "vídeo do casamento terminou").
 * C#: `GameSocketOut.sendChurchMovieOver(int, String)` não é chamado por nenhum ponto do AS3
 * (`Source Flash/src`, confirmado por grep; `vendor/DDT-6600` é igual), e o servidor C# só declara o
 * valor do enum em `Packets/ePackageType.cs:66` — não existe `Packets/Client/*.cs` nem registro algum;
 * um 4.1 ao vivo só logaria "unhandled package" se isso chegasse. Este port registra um stub seguro
 * (lê o int + string que o cliente mandaria, não responde nada) só pra `tools/qa/packet-coverage.mjs`
 * parar de marcar como MISSING — não há comportamento real pra espelhar.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** 167 CHURCH_MOVIE_OVER: int, str — dead wire, sem call site AS3 e sem handler C#. */
export function churchMovieOver(ctx: ServerContext, _p: GamePlayer, pkt: GSPacket): void {
  const arg = pkt.readInt();
  const text = pkt.readString();
  ctx.log.debug(`167 CHURCH_MOVIE_OVER: noop (arg=${arg}, text=${text})`);
}
