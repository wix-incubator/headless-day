import { useEffect, useState } from 'react';
import { NALU } from './dialogue';

interface Props { lines: string[]; cta: string; onDone: () => void; instant?: boolean }

export function SpeechBubble({ lines, cta, onDone, instant = false }: Props) {
  const [i, setI] = useState(0);
  const [chars, setChars] = useState(instant ? Infinity : 0);
  const line = lines[i];
  const last = i === lines.length - 1;
  const fullyTyped = chars >= line.length;

  useEffect(() => {
    if (instant) return;
    setChars(0);
    const id = setInterval(() => setChars((c) => c + 2), 33);
    return () => clearInterval(id);
  }, [i, instant]);

  const advance = () => {
    if (!fullyTyped) return setChars(Infinity);
    if (!last) setI(i + 1);
  };

  return (
    <div className="bb-card bb-bubble" role="dialog" aria-label="Nalu says">
      <span className="who">{NALU}</span>
      <p style={{ margin: 0 }}>{instant || fullyTyped ? line : line.slice(0, chars)}</p>
      {last && fullyTyped
        ? <button className="bb-btn" onClick={onDone}>{cta}</button>
        : <button className="bb-btn bb-btn--sun" onClick={advance} aria-label="next">▸</button>}
      <button className="bb-link" onClick={onDone}>Skip intro</button>
    </div>
  );
}
