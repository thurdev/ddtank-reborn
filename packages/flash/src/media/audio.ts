/**
 * Áudio em WebAudio: um AudioContext, cache de buffers decodificados por URL,
 * volume global (SoundMixer). Navegador só libera áudio depois do 1º clique
 * — o Player chama `unlockAudio()` no primeiro input.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

export function audioCtx(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  return ctx;
}

export function masterGain(): GainNode | null {
  audioCtx();
  return master;
}

export function unlockAudio(): void {
  const c = audioCtx();
  if (c && c.state === "suspended") void c.resume();
}

export function loadBuffer(url: string): Promise<AudioBuffer | null> {
  let p = buffers.get(url);
  if (!p) {
    p = (async () => {
      const c = audioCtx();
      if (!c) return null;
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        return await c.decodeAudioData(await r.arrayBuffer());
      } catch {
        return null;
      }
    })();
    buffers.set(url, p);
  }
  return p;
}
