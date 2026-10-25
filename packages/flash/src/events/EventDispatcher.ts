/**
 * `flash.events.EventDispatcher` — listeners com prioridade, captura e bolha.
 *
 * Objetos de display sobem a cadeia pelo `parent` (DisplayObject sobrescreve
 * `$eventParent`). Erro dentro de listener propaga pra quem chamou
 * dispatchEvent (igual ao Flash); eventos disparados pelo "player" (mouse,
 * enterFrame, timer) pegam o erro e mostram no console sem parar o jogo
 * (ver `player.ts`, função `safe`).
 */
import { $class } from "../as3";
import { Event } from "./Event";
import { IEventDispatcher } from "./IEventDispatcher";

interface Listener {
  fn: (e: any) => void;
  priority: number;
}

type ListenerMap = Map<string, Listener[]>;

/**
 * Eventos de "broadcast": o Flash entrega pra TODOS os objetos que escutam,
 * mesmo fora do palco (ENTER_FRAME, EXIT_FRAME, ACTIVATE...). O Player usa
 * estas listas a cada frame.
 */
export const BROADCAST_EVENTS = ["enterFrame", "exitFrame", "frameConstructed", "activate", "deactivate"] as const;
export const broadcastTargets = new Map<string, Set<EventDispatcher>>(BROADCAST_EVENTS.map((t) => [t, new Set()]));
/** atalho: quem escuta ENTER_FRAME */
export const enterFrameTargets = broadcastTargets.get("enterFrame")!;

export class EventDispatcher {
  /** listeners de bolha/alvo */
  $listeners: ListenerMap | null = null;
  /** listeners de captura */
  $captures: ListenerMap | null = null;
  $dispatchTarget: any;

  constructor(target: any = null) {
    this.$dispatchTarget = target ?? this;
  }

  // `listener: Function` (não `(e: any) => void`) pra bater com a assinatura
  // real do Flash (`IEventDispatcher.as`): o AS3 também aceita `var f:Function`
  // (closure forward-declarada sem assinatura) nesse parâmetro.
  addEventListener(type: string, listener: Function, useCapture = false, priority = 0, _useWeakReference = false): void {
    if (typeof listener !== "function") return;
    const fn = listener as (e: any) => void;
    const map = useCapture ? (this.$captures ??= new Map()) : (this.$listeners ??= new Map());
    const arr: Listener[] = map.get(type) ?? [];
    if (arr.some((l) => l.fn === fn)) return;
    // lista nova (dispatch em andamento itera a antiga); prioridade maior primeiro, empate = ordem de inscrição
    const next = arr.slice();
    let i = next.length;
    while (i > 0 && next[i - 1]!.priority < priority) i--;
    next.splice(i, 0, { fn, priority });
    map.set(type, next);
    if (!useCapture) broadcastTargets.get(type)?.add(this);
  }

  removeEventListener(type: string, listener: Function, useCapture = false): void {
    const map = useCapture ? this.$captures : this.$listeners;
    const arr = map?.get(type);
    if (!arr) return;
    const i = arr.findIndex((l) => l.fn === listener);
    if (i >= 0) {
      const next = arr.slice();
      next.splice(i, 1);
      if (next.length) map!.set(type, next);
      else map!.delete(type);
    }
    if (!this.$listeners?.get(type)?.length) broadcastTargets.get(type)?.delete(this);
  }

  hasEventListener(type: string): boolean {
    return !!(this.$listeners?.get(type)?.length || this.$captures?.get(type)?.length);
  }

  willTrigger(type: string): boolean {
    for (let o: EventDispatcher | null = this; o; o = o.$eventParent()) if (o.hasEventListener(type)) return true;
    return false;
  }

  /** pai na cadeia de eventos (display list); EventDispatcher puro não tem */
  $eventParent(): EventDispatcher | null {
    return null;
  }

  dispatchEvent(event: Event): boolean {
    if (event.$target) event = event.clone();
    event.$target = this.$dispatchTarget;
    event.$stop = 0;
    // cadeia: [pai, avô, ..., stage]
    const chain: EventDispatcher[] = [];
    for (let p = this.$eventParent(); p; p = p.$eventParent()) chain.push(p);
    if (chain.length) {
      event.$phase = 1;
      for (let i = chain.length - 1; i >= 0 && !event.$stop; i--) chain[i]!.$invoke(event, true);
    }
    if (!event.$stop) {
      event.$phase = 2;
      this.$invoke(event, false);
    }
    if (event.$bubbles) {
      event.$phase = 3;
      for (let i = 0; i < chain.length && !event.$stop; i++) chain[i]!.$invoke(event, false);
    }
    event.$currentTarget = null;
    return !event.$prevented;
  }

  /** chama os listeners deste objeto numa fase */
  $invoke(event: Event, capture: boolean): void {
    const arr = (capture ? this.$captures : this.$listeners)?.get(event.$type);
    if (!arr || !arr.length) return;
    event.$currentTarget = this.$dispatchTarget;
    for (const l of arr) {
      l.fn.call(null, event);
      if (event.$stop === 2) break;
    }
  }

  toString(): string {
    return "[object EventDispatcher]";
  }
}
$class(EventDispatcher, "flash.events.EventDispatcher", { implements: [IEventDispatcher] });
