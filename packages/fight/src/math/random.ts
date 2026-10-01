/**
 * Port of .NET `System.Random(int seed)` (the seeded "Net5CompatSeedImpl", Knuth subtractive generator), so that a game
 * seeded with the same value draws exactly the same numbers as the C# server (`BaseGame.m_random`). Verified against
 * .NET 10 by the golden vectors (`random` section).
 */
const MBIG = 2147483647;
const MSEED = 161803398;

export interface Rng {
  /** `Next()` — [0, int.MaxValue) */
  next(): number;
  /** `Next(max)` — [0, max) */
  nextMax(max: number): number;
  /** `Next(min, max)` — [min, max) */
  nextRange(min: number, max: number): number;
  /** `NextDouble()` — [0, 1) */
  nextDouble(): number;
}

export class DotNetRandom implements Rng {
  private readonly seedArray = new Int32Array(56);
  private inext = 0;
  private inextp = 21;

  constructor(seed: number) {
    const subtraction = seed === -2147483648 ? MBIG : Math.abs(seed | 0);
    let mj = (MSEED - subtraction) | 0;
    this.seedArray[55] = mj;
    let mk = 1;
    for (let i = 1; i < 55; i++) {
      const ii = (21 * i) % 55;
      this.seedArray[ii] = mk;
      mk = (mj - mk) | 0;
      if (mk < 0) mk += MBIG;
      mj = this.seedArray[ii];
    }
    for (let k = 1; k < 5; k++) {
      for (let i = 1; i < 56; i++) {
        let v = (this.seedArray[i] - this.seedArray[1 + ((i + 30) % 55)]) | 0;
        if (v < 0) v += MBIG;
        this.seedArray[i] = v;
      }
    }
  }

  private internalSample(): number {
    let locINext = this.inext + 1;
    if (locINext >= 56) locINext = 1;
    let locINextp = this.inextp + 1;
    if (locINextp >= 56) locINextp = 1;
    let ret = (this.seedArray[locINext] - this.seedArray[locINextp]) | 0;
    if (ret === MBIG) ret--;
    if (ret < 0) ret += MBIG;
    this.seedArray[locINext] = ret;
    this.inext = locINext;
    this.inextp = locINextp;
    return ret;
  }

  private sample(): number {
    return this.internalSample() * (1.0 / MBIG);
  }

  next(): number {
    return this.internalSample();
  }

  nextMax(max: number): number {
    if (max < 0) throw new RangeError("max < 0");
    return Math.trunc(this.sample() * max);
  }

  nextRange(min: number, max: number): number {
    if (min > max) throw new RangeError("min > max");
    const range = max - min;
    if (range <= MBIG) return Math.trunc(this.sample() * range) + min;
    // Large range (never used by the fight engine); mirrors GetSampleForLargeRange.
    let result = this.internalSample();
    if (this.internalSample() % 2 === 0) result = -result;
    let d = result;
    d += MBIG - 1;
    d /= 2 * MBIG - 1;
    return Math.trunc(d * range) + min;
  }

  nextDouble(): number {
    return this.sample();
  }
}

/** Gaussian sample (Box–Muller) on top of any Rng; used by the bot difficulty model. */
export function gaussian(rng: Rng, sigma: number): number {
  if (sigma <= 0) return 0;
  let u = rng.nextDouble();
  if (u < 1e-12) u = 1e-12;
  const v = rng.nextDouble();
  return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
