/** Read a CLI flag value: arg("--count", 10) for `--count 20`. */
export function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** Deterministic shuffle so re-running a fetch script picks the same sample. */
export function seededShuffle(arr, seed = 1) {
  let s = seed >>> 0 || 1;
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const a = [...arr];
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1));
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a;
}
