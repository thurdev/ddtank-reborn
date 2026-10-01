/**
 * Numeric helpers that reproduce C# semantics.
 *
 * - `f32` = `Math.fround`: every C# `float` operation is rounded to binary32 (RyuJIT/SSE never keeps extra precision
 *   and never contracts to FMA, so rounding after each op is bit-exact).
 * - `int`  = C# `(int)` cast of a float/double: truncation toward zero (values here are always in range).
 * - `idiv` = C# integer division (truncates toward zero).
 * - `roundEven` = `Math.Round(double)` (MidpointRounding.ToEven, the .NET default).
 */
export const f32 = Math.fround;

export function int(v: number): number {
  return Math.trunc(v) | 0;
}

export function idiv(a: number, b: number): number {
  return Math.trunc(a / b) | 0;
}

export function roundEven(v: number): number {
  const r = Math.round(v);
  // Math.round rounds .5 up; .NET rounds .5 to the even neighbour.
  if (Math.abs(v - Math.trunc(v)) === 0.5) return 2 * Math.round(v / 2);
  return r;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
