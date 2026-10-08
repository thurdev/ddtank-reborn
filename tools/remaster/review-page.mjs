// Review page: every remastered image, original next to the PT-BR result, for marking the ones to redo.
// Writes remaster/_review.html (open it straight from disk; image paths are relative). Marks are kept in the browser
// (localStorage) and exported with the "Exportar" button as review-marks.json -> fed back to the queue as rejects.
//   node tools/remaster/review-page.mjs
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = join(ROOT, "remaster"), AUTO = join(R, "_auto");
const read = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : d);
const specs = read(join(AUTO, "specs.json"), {});
const tr = read(join(AUTO, "translations.json"), {});
const state = read(join(AUTO, "state.json"), { jobs: {} }).jobs;
const round1 = new Set((read(join(AUTO, "review-marks-1.json"), { redo: [] }).redo ?? []).map((r) => r.id));
const notes = Object.fromEntries(read(join(AUTO, "review-notes.json"), []).map((n) => [n.id, n.note]));

const items = [];
for (const cat of readdirSync(R).filter((c) => /^\d\d-/.test(c) && existsSync(join(R, c, "inputs")))) {
  const outs = new Set(existsSync(join(R, cat, "outputs")) ? readdirSync(join(R, cat, "outputs")) : []);
  for (const f of readdirSync(join(R, cat, "inputs"))) {
    const id = f.replace(/\.(png|jpe?g)$/i, "");
    const out = outs.has(id + ".png") ? `${cat}/outputs/${id}.png` : null;
    const st = state[id] ?? {};
    if (!out && !(specs[id]?.pt ?? tr[id])) continue; // image without text (not part of the remaster jobs)
    items.push({ id, cat, src: `${cat}/inputs/${f}`, out, pt: specs[id]?.pt ?? tr[id] ?? "", method: st.method ?? (out ? "ai" : ""), note: notes[id] ?? "", redo: round1.has(id), skip: !!specs[id]?.skip });
  }
}

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Revisão do Remaster</title>
<style>
:root{--bg:#14161c;--card:#1d2029;--line:#2c3140;--fg:#e7e9ef;--mut:#8b91a3;--ok:#3fbf7f;--bad:#e5484d;--acc:#f5b83d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,Segoe UI,sans-serif}
header{position:sticky;top:0;z-index:5;background:#0f1116ee;backdrop-filter:blur(6px);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
h1{font-size:16px;margin:0 12px 0 0}button,select,input{background:var(--card);color:var(--fg);border:1px solid var(--line);border-radius:6px;padding:6px 10px;font:inherit;cursor:pointer}
button.on{border-color:var(--acc);color:var(--acc)}.stat{color:var(--mut);margin-left:auto}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:12px;padding:16px}
.c{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px}
.c.bad{border-color:var(--bad)}.c.ok{border-color:#2b5a43}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pair div{min-height:60px;display:flex;align-items:center;justify-content:center;border-radius:6px;overflow:hidden;background:var(--pbg)}
.pair img{max-width:100%;image-rendering:pixelated}.lbl{font-size:11px;color:var(--mut)}
.id{font:12px ui-monospace,Consolas,monospace;color:var(--mut);word-break:break-all}.pt{white-space:pre-wrap}
.note{color:var(--acc);font-size:12px}.row{display:flex;gap:6px;align-items:center}.row textarea{flex:1;min-height:30px;background:#14161c;color:var(--fg);border:1px solid var(--line);border-radius:6px;padding:4px 6px;font:inherit;resize:vertical}
.b-ok.on{background:#1d3a2c;border-color:var(--ok);color:#bff0d6}.b-bad.on{background:#3a1d20;border-color:var(--bad);color:#ffd0d2}
@media (max-width:480px){main{grid-template-columns:1fr;padding:10px}}
</style></head><body>
<header><h1>Revisão do Remaster</h1>
<select id="f"><option value="redo">Refeitas (rodada 1)</option><option value="all">Todas</option><option value="todo">Não revisadas</option><option value="bad">Marcadas p/ refazer</option><option value="note">Com observação</option><option value="missing">Sem resultado</option></select>
<select id="cat"><option value="">Todas as categorias</option></select>
<input id="q" placeholder="buscar id ou texto" size="16">
<button id="bgb">Fundo: escuro</button><button id="zm">Zoom 2x</button>
<button id="exp">Exportar marcas</button><span class="stat" id="st"></span></header>
<main id="m"></main>
<script>
const items=${JSON.stringify(items)};
const KEY="ddt-remaster-review-2";let marks={};try{marks=JSON.parse(localStorage.getItem(KEY)||"{}")}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(marks))}catch{}stat()};
const bgs=["#2b3a55","#f3f3f3","conic-gradient(#888 25%,#bbb 0 50%,#888 0 75%,#bbb 0) 0 0/16px 16px"],bgn=["escuro","claro","xadrez"];let bi=0,zoom=1;
document.body.style.setProperty("--pbg",bgs[0]);
const cats=[...new Set(items.map(i=>i.cat))];for(const c of cats){const o=document.createElement("option");o.value=c;o.textContent=c;cat.append(o)}
function stat(){const v=Object.values(marks);st.textContent=items.filter(i=>i.out).length+" prontas · "+v.filter(m=>m.s==="ok").length+" ok · "+v.filter(m=>m.s==="bad").length+" refazer"}
function card(i){const m=marks[i.id]||{};const d=document.createElement("div");d.className="c "+(m.s||"");
d.innerHTML='<div class="pair"><div><img loading="lazy" src="'+i.src+'"></div><div>'+(i.out?'<img loading="lazy" src="'+i.out+'?v='+Date.now()+'">':'<span class="lbl">sem resultado</span>')+'</div></div>'
+'<div class="lbl">original &nbsp;→&nbsp; PT-BR · '+(i.method||"-")+'</div><div class="pt"></div>'+(i.note?'<div class="note"></div>':'')+'<div class="id"></div>'
+'<div class="row"><button class="b-ok">OK</button><button class="b-bad">Refazer</button><textarea placeholder="o que está errado?"></textarea></div>';
d.querySelector(".pt").textContent=i.pt;if(i.note)d.querySelector(".note").textContent="obs: "+i.note;d.querySelector(".id").textContent=i.id;
d.querySelectorAll("img").forEach(im=>{im.onload=()=>{im.style.width=im.naturalWidth*zoom+"px"}});
const ok=d.querySelector(".b-ok"),bad=d.querySelector(".b-bad"),ta=d.querySelector("textarea");ta.value=m.c||"";
const paint=()=>{const s=(marks[i.id]||{}).s;ok.classList.toggle("on",s==="ok");bad.classList.toggle("on",s==="bad");d.className="c "+(s||"")};paint();
ok.onclick=()=>{marks[i.id]={...(marks[i.id]||{}),s:marks[i.id]?.s==="ok"?undefined:"ok"};save();paint()};
bad.onclick=()=>{marks[i.id]={...(marks[i.id]||{}),s:marks[i.id]?.s==="bad"?undefined:"bad"};save();paint()};
ta.oninput=()=>{marks[i.id]={...(marks[i.id]||{}),c:ta.value};if(ta.value&&!marks[i.id].s)marks[i.id].s="bad";save();paint()};return d}
function render(){const q=document.getElementById("q").value.toLowerCase(),fv=f.value,cv=cat.value;m.replaceChildren(...items.filter(i=>{const s=(marks[i.id]||{}).s;
if(cv&&i.cat!==cv)return false;if(q&&!(i.id.toLowerCase().includes(q)||i.pt.toLowerCase().includes(q)))return false;
if(fv==="redo")return i.redo;if(fv==="todo")return i.out&&!s;if(fv==="bad")return s==="bad";if(fv==="note")return !!i.note;if(fv==="missing")return !i.out&&!i.skip;return true}).map(card));stat()}
f.onchange=render;cat.onchange=render;document.getElementById("q").oninput=render;
bgb.onclick=()=>{bi=(bi+1)%3;document.body.style.setProperty("--pbg",bgs[bi]);bgb.textContent="Fundo: "+bgn[bi]};
zm.onclick=()=>{zoom=zoom===1?2:1;zm.classList.toggle("on",zoom===2);document.querySelectorAll(".pair img").forEach(im=>{im.style.width=im.naturalWidth*zoom+"px"})};
exp.onclick=()=>{const out=Object.entries(marks).filter(([,v])=>v.s==="bad").map(([id,v])=>({id,comment:v.c||""}));const b=new Blob([JSON.stringify({exported:new Date().toISOString(),redo:out,ok:Object.entries(marks).filter(([,v])=>v.s==="ok").map(([id])=>id)},null,1)],{type:"application/json"});
const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="review-marks.json";a.click()};
render();
</script></body></html>`;
writeFileSync(join(R, "_review.html"), html);
console.log(`remaster/_review.html: ${items.length} images, ${items.filter((i) => i.out).length} with result`);
