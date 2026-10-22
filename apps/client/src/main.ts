/**
 * Entrada do cliente DDTank em PixiJS.
 *
 * Faz o papel da página `playgame.aspx` + `Loading.swf` do Flash:
 *   1. lê os "flashvars" da URL: `?user=<conta>&key=<chave de login>` (o site
 *      gera — ver apps/api `playConfig`), opcionais `config`, `ws`, `debug`;
 *   2. liga o "Flash Player" (packages/flash: Stage sobre PixiJS);
 *   3. registra todas as classes do jogo (`game/all.ts`) e o índice de assets;
 *   4. instancia a classe de entrada original `Loading` (lê config.xml,
 *      LoginSelectList, abre criação de personagem ou o jogo).
 *
 * Exemplo local: http://localhost:5180/?user=alice&key=XXXX&debug=true
 */
import { $cls } from "@ddt/flash/as3";
import { startPlayer } from "@ddt/flash/player";
import { LoaderInfo } from "@ddt/flash/display/LoaderInfo";
import { setSocketResolver } from "@ddt/flash/net/Socket";
import { setResponseFilter, setUrlRewriter } from "@ddt/flash/net/http";
import { loadAssetIndex } from "@ddt/flash/swf/index-of-assets";
import { setAssetBase } from "@ddt/flash/swf/paths";
import { SwfLibrary } from "@ddt/flash/swf/SwfLibrary";
import { withSymbol } from "@ddt/flash/swf/symbol";
import { dlog } from "@ddt/flash/debug";
import "./game/all";

const q = new URLSearchParams(location.search);
/** servidor da API (config.xml, Request/*.ashx, resource/): padrão = mesmo host, porta 8080 */
const API = (q.get("api") ?? `${location.protocol}//${location.hostname}:8080`).replace(/\/$/, "");

async function boot(): Promise<void> {
  const container = document.getElementById("game")!;
  const stage = await startPlayer({ container, width: 1000, height: 600, frameRate: 25, background: 0x000000 });

  // flashvars (playgame.aspx passava user/key/config pro Loading.swf)
  const info = new LoaderInfo(null);
  info.$url = `${API}/flash/Loading.swf`;
  info.$loaderURL = `${API}/flash/Loading.swf`;
  info.$parameters = {
    user: q.get("user") ?? "",
    key: q.get("key") ?? "",
    config: q.get("config") ?? `${API}/flash/config.xml`,
    rid: q.get("rid") ?? "",
    site: q.get("site") ?? "",
    enterCode: q.get("enterCode") ?? "",
  };
  stage.$loaderInfo = info;

  // assets exportados (PNG + library.json) moram no próprio cliente
  setAssetBase(`${import.meta.env.BASE_URL}assets/`);
  await loadAssetIndex();
  // o jogo pede tudo em minúsculas (LoaderManager); URLs relativas vão pra API
  setUrlRewriter((url) => (/^[a-z]+:\/\//i.test(url) ? url : `${API}/flash/${url.replace(/^\/+/, "")}`));
  // md5.xml listava o md5 dos SWFs (cabeçalho "road7"). Sem SWF não há o que conferir:
  // devolve a lista vazia (o código original segue o caminho "sem md5" normalmente)
  setResponseFilter((url, bytes) => (/\/md5\.xml/i.test(url) ? new TextEncoder().encode("<Result/>") : bytes));
  // socket do jogo → WebSocket do apps/game
  setSocketResolver((host, port) => q.get("ws") ?? `ws://${host}:${port + 100}/ws`);

  dlog("info", `boot: user=${info.$parameters.user || "(vazio)"} api=${API}`);
  // Loading.swf era o SWF de entrada: carrega a arte dele (tela/botões) e cria a classe de documento
  const lib = await SwfLibrary.load("flash/loading");
  const Loading = $cls("Loading");
  stage.addChild(withSymbol({ lib, id: 0, char: { k: "sprite", tl: lib.data.main } }, () => new Loading()));
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML("beforeend", `<pre style="color:#f66;position:fixed;left:8px;bottom:8px;z-index:99">${String(e?.stack ?? e)}</pre>`);
});
