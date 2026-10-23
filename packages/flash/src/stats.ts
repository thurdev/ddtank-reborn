/**
 * Contador de desempenho (canto da tela). Liga com `?fps=1` (ou `?debug=true`);
 * F9 mostra/esconde.
 *
 *   tela 60 · lógica 25 · 3.1/2.4 ms · rede 38 ms · ↓12 ↑4/s · 1834 nós
 *
 * - **tela**: quadros desenhados por segundo (requestAnimationFrame; alvo = taxa do monitor).
 * - **lógica**: quadros do jogo por segundo (o original roda a 25; timeline, física e
 *   tweens dependem disso — a suavidade acima de 25 vem da interpolação, ver interp.ts).
 * - **ms**: custo médio por quadro de lógica / de desenho (acima de ~16 ms começa a cair FPS).
 * - **rede**: tempo entre mandar um pacote e chegar a resposta com o mesmo código (RTT).
 * - **↓ ↑/s**: pacotes recebidos/enviados por segundo.
 * - **nós**: objetos de exibição no palco.
 */
const params = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
const on = (k: string) => params.get(k) === "1" || params.get(k) === "true";
export const STATS_ON = on("fps") || on("debug");

let renders = 0, logics = 0, logicMs = 0, renderMs = 0, pin = 0, pout = 0;
let rtt = -1;
const pendingOut = new Map<number, number>();

export const Stats = {
  render(ms: number): void { renders++; renderMs += ms; },
  logic(ms: number): void { logics++; logicMs += ms; },
  /** chamado pelo ByteSocket (via debugGamePacket) a cada pacote */
  packet(dir: "in" | "out", code: number): void {
    const now = performance.now();
    if (dir === "out") { pout++; pendingOut.set(code, now); return; }
    pin++;
    const t = pendingOut.get(code);
    if (t !== undefined) { rtt = rtt < 0 ? now - t : rtt * 0.7 + (now - t) * 0.3; pendingOut.delete(code); }
  },
};

/** cria o painel e atualiza 2x por segundo; `count` devolve o nº de nós */
export function startStats(host: HTMLElement, count: () => number): void {
  if (!STATS_ON || typeof document === "undefined") return;
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "absolute", left: "4px", top: "4px", zIndex: "20", pointerEvents: "none",
    font: "11px/1.3 monospace", color: "#7CFC00", background: "rgba(0,0,0,.6)", padding: "2px 6px", borderRadius: "3px",
    whiteSpace: "pre",
  } as CSSStyleDeclaration);
  host.appendChild(el);
  window.addEventListener("keydown", (e) => { if (e.key === "F9") el.style.display = el.style.display === "none" ? "" : "none"; });
  let t0 = performance.now();
  setInterval(() => {
    const now = performance.now(), s = (now - t0) / 1000;
    t0 = now;
    const fps = renders / s, lfps = logics / s;
    const lm = logics ? logicMs / logics : 0, rm = renders ? renderMs / renders : 0;
    el.style.color = fps < 40 || lfps < 22 ? "#FF6347" : "#7CFC00";
    el.textContent = `tela ${fps.toFixed(0)} · lógica ${lfps.toFixed(0)} · ${lm.toFixed(1)}/${rm.toFixed(1)} ms`
      + ` · rede ${rtt < 0 ? "–" : rtt.toFixed(0) + " ms"} · ↓${(pin / s).toFixed(0)} ↑${(pout / s).toFixed(0)}/s · ${count()} nós`;
    renders = logics = logicMs = renderMs = pin = pout = 0;
    (globalThis as any).ddtStats = { fps, logicFps: lfps, logicMs: lm, renderMs: rm, rtt };
  }, 500);
}
