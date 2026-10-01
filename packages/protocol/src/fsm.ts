/**
 * Port of Road.Base.Packets.FSM (Game.Base/Base/Packets/FSM.cs) / ByteSocket's private FSM class.
 * Both sides still create it with (2059198199, 1501) but the 4.1 cipher never uses its state
 * (StreamProcessor only calls send_fsm.UpdateState() after each encrypted send). Kept for completeness and for
 * the older 2.x protocol variant, which derived an XOR keystream from it.
 */
export class FSM {
  private adder: number;
  private multiplier: number;
  private state = 0;
  count = 0;

  constructor(adder: number, multiplier: number) {
    this.adder = adder | 0;
    this.multiplier = multiplier | 0;
    this.updateState();
  }

  getState(): number {
    return this.state;
  }

  setup(adder: number, multiplier: number): void {
    this.adder = adder | 0;
    this.multiplier = multiplier | 0;
    this.updateState();
  }

  /** AS3 only. */
  reset(): void {
    this.state = 0;
  }

  /** _state = (~_state + _adder) * _mulitper; _state ^= _state >> 16 (int32 wrap-around). */
  updateState(): number {
    let s = Math.imul((~this.state + this.adder) | 0, this.multiplier);
    s ^= s >> 16;
    this.state = s;
    this.count++;
    return s;
  }
}
