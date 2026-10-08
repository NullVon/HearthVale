// UI randomness only. The Shell's seed=1 default stays reproducible.
export function freshGameSeed(source = globalThis.crypto) {
  return source.getRandomValues(new Uint32Array(1))[0];
}
