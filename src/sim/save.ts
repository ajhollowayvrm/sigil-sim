// The single seam for persisting a recorded game. Today it downloads a JSON file
// you can commit to the repo (where the tuning pass reads it from). If we later
// want frictionless capture, `saveRecording` is the ONE function to change — point
// it at an AWS S3/Lambda endpoint and every play session uploads automatically,
// with no change to the UI or the engine.

import type { GameRecording } from "./record";
import { recordingFilename } from "./record";

/** Persist a finished recording. Currently: browser download. */
export function saveRecording(rec: GameRecording): void {
  const blob = new Blob([JSON.stringify(rec, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = recordingFilename(rec);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Phase 2 (opt-in): auto-upload to AWS. Left as a stub so the wiring is obvious.
// export async function uploadRecording(rec: GameRecording): Promise<void> {
//   await fetch(import.meta.env.VITE_RECORD_ENDPOINT, {
//     method: "POST",
//     headers: { "content-type": "application/json" },
//     body: JSON.stringify(rec),
//   });
// }
