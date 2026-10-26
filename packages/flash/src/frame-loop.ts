/**
 * Uma "frame lógica" do Flash Player, na ordem exata documentada pela Adobe
 * (referência de `flash.events.Event.FRAME_CONSTRUCTED`):
 *
 *   enterFrame → as tags do frame executam (timelines avançam: cria/move/
 *   remove filhos) → frameConstructed → frame scripts (`addFrameScript`,
 *   código das classes do jogo ligado a um frame) → exitFrame → render.
 *
 * Extraído de `player.ts` pra poder testar a ordem sem precisar de
 * `PIXI.Application`/canvas (ver `display/MovieClip.test.ts`).
 *
 * Importa: ouvintes de `ENTER_FRAME` devem ver o estado de ANTES da timeline
 * avançar (igual ao Flash) — é o inverso do que parece natural ("avança e
 * depois avisa"), mas é a ordem real; bastante código do jogo (convertido do
 * AS3) usa `ENTER_FRAME` pra ler `currentFrame`/posição antes de decidir o
 * próximo passo, então inverter essa ordem deixa toda animação guiada por
 * `ENTER_FRAME` um frame "adiantada" em relação ao Flash original.
 */
import { Event } from "./events/Event";
import { broadcastTargets } from "./events/EventDispatcher";
import { playingClips, runPendingFrameScripts } from "./display/MovieClip";
import { safe } from "./player-safe";

export function broadcastEvent(type: string): void {
  for (const t of [...broadcastTargets.get(type)!]) safe(() => t.dispatchEvent(new Event(type)), type);
}

export function runLogicFrame(onRender: () => void): void {
  broadcastEvent(Event.ENTER_FRAME);
  for (const mc of [...playingClips]) safe(() => mc.$advance(), "timeline");
  broadcastEvent(Event.FRAME_CONSTRUCTED);
  runPendingFrameScripts();
  broadcastEvent(Event.EXIT_FRAME);
  safe(onRender, "RENDER");
}
