// A settable log sink so engine mechanics can emit play-by-play lines without
// importing the recorder or any UI. game() points this at the active recorder
// (watch mode) and nulls it for batch runs (zero overhead, fully deterministic).

let sink: ((s: string) => void) | null = null;

export function setLog(fn: ((s: string) => void) | null): void {
  sink = fn;
}

export function log(s: string): void {
  if (sink) sink(s);
}

export function logging(): boolean {
  return sink !== null;
}
