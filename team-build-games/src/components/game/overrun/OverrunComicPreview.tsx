/** Standalone preview harness for the Overrun intro comic (dev aid — not the campaign wiring). */
import { useState } from "react";
import OverrunComic from "./OverrunComic";

export default function OverrunComicPreview() {
  const [runId, setRunId] = useState(0);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="font-display text-xs text-cyan-300">Intro complete</p>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setRunId((n) => n + 1);
          }}
          className="arcade-btn"
        >
          ▶ Replay
        </button>
      </div>
    );
  }
  return <OverrunComic key={runId} onDone={() => setDone(true)} />;
}
