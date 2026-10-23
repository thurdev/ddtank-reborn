/** `flash.events.IEventDispatcher` */
import { $interface } from "../as3";

export interface IEventDispatcher {
  addEventListener(type: string, listener: Function, useCapture?: boolean, priority?: number, useWeakReference?: boolean): void;
  removeEventListener(type: string, listener: Function, useCapture?: boolean): void;
  dispatchEvent(event: any): boolean;
  hasEventListener(type: string): boolean;
  willTrigger(type: string): boolean;
}
export const IEventDispatcher = $interface("flash.events.IEventDispatcher");
