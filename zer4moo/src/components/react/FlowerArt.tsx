// Hand-drawn watercolor-soft stems, upright in a 44×132 viewBox (base x22/y130)
// so instances fan cleanly around a shared base. Layered fills give soft depth.
type Props = { id: string; height?: number };

const STEM = '#6E8A57';
const STEM_DK = '#54703F';

function Stem({ d = 'M22 130 C 19 96, 25 58, 22 30' }: { d?: string }) {
  return <path d={d} stroke={STEM} strokeWidth={3.2} fill="none" strokeLinecap="round" />;
}
function Leaf({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  const s = flip ? -1 : 1;
  return (
    <g>
      <path d={`M${x} ${y} q ${13 * s} -3 ${17 * s} -13 q ${-6 * s} 11 ${-17 * s} 13 Z`} fill={STEM} />
      <path d={`M${x} ${y} q ${9 * s} -3 ${14 * s} -10`} stroke={STEM_DK} strokeWidth="0.9" fill="none" opacity="0.45" />
    </g>
  );
}
function ring(n: number, r: number, cx = 22, cy = 24) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, a: (a * 180) / Math.PI };
  });
}

const arts: Record<string, JSX.Element> = {
  timothy: (
    <>
      <Stem />
      <Leaf x={22} y={80} />
      <ellipse cx="22" cy="24" rx="8" ry="21" fill="#DFC07E" />
      <ellipse cx="22" cy="24" rx="5" ry="17" fill="#ECD8A0" />
      {[7, 14, 21, 28, 35, 42].map((y) => (
        <g key={y} stroke="#CDAB68" strokeWidth="1.1" strokeLinecap="round">
          <line x1="22" y1={y} x2="13" y2={y - 3} /><line x1="22" y1={y} x2="31" y2={y - 3} />
        </g>
      ))}
    </>
  ),
  wheat: (
    <>
      <Stem />
      <Leaf x={22} y={92} flip />
      {/* awns */}
      <g stroke="#D9B871" strokeWidth="1" strokeLinecap="round" opacity="0.9">
        {[6, 12, 18, 24, 30].map((y) => (<g key={y}><line x1="22" y1={y} x2="12" y2={y - 8} /><line x1="22" y1={y} x2="32" y2={y - 8} /></g>))}
      </g>
      {/* grains */}
      {[10, 18, 26, 34].map((y, i) => (
        <g key={y}>
          <ellipse cx={i % 2 ? 26 : 18} cy={y} rx="4.2" ry="6" fill="#E6C983" transform={`rotate(${i % 2 ? 18 : -18} ${i % 2 ? 26 : 18} ${y})`} />
        </g>
      ))}
      <ellipse cx="22" cy="8" rx="3.6" ry="6.5" fill="#EAD196" />
    </>
  ),
  ryegrass: (
    <>
      {[[-16, 20], [-8, 8], [0, 2], [8, 8], [16, 22]].map(([dx, ty], i) => (
        <path key={i} d={`M22 130 C ${22 + dx / 2} 80, ${22 + dx} 40, ${22 + dx * 1.4} ${ty}`}
          stroke={i % 2 ? STEM : STEM_DK} strokeWidth="3" fill="none" strokeLinecap="round" />
      ))}
    </>
  ),
  alfalfa: (
    <>
      <Stem />
      {[50, 66, 82, 98].map((y, i) => <Leaf key={y} x={22} y={y} flip={i % 2 === 0} />)}
      <g fill="#B49AD1">{ring(6, 5, 22, 22).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.6" />)}</g>
      <circle cx="22" cy="22" r="2.4" fill="#9E82C2" />
    </>
  ),
  lavender: (
    <>
      <Stem d="M22 130 C 20 98, 24 66, 22 42" />
      <Leaf x={22} y={96} />
      {[4, 10, 16, 22, 28, 34].map((y, i) => (
        <g key={y} fill={i % 2 ? '#B9A3DA' : '#A98FCF'}>
          <ellipse cx={18} cy={y} rx="3" ry="3.6" /><ellipse cx={26} cy={y - 2} rx="3" ry="3.6" /><ellipse cx={22} cy={y - 4} rx="3" ry="3.8" />
        </g>
      ))}
    </>
  ),
  clover: (
    <>
      <Stem />
      <Leaf x={22} y={86} />
      <g fill="#DFA0B5">{ring(6, 6.5, 22, 24).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="5" />)}</g>
      <g fill="#D98FA6">{ring(5, 4, 22, 23).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4.6" />)}</g>
      <circle cx="22" cy="24" r="4" fill="#C97C96" />
    </>
  ),
  dandelion: (
    <>
      <Stem />
      <Leaf x={22} y={82} flip />
      <g stroke="#E6B54A" strokeWidth="2.6" strokeLinecap="round">{ring(16, 12).map((p, i) => <line key={i} x1={22} y1={24} x2={p.x} y2={p.y} />)}</g>
      <g stroke="#F0CE6A" strokeWidth="2" strokeLinecap="round">{ring(12, 8).map((p, i) => <line key={i} x1={22} y1={24} x2={p.x} y2={p.y} />)}</g>
      <circle cx="22" cy="24" r="5.5" fill="#F2D77E" />
    </>
  ),
  buttercup: (
    <>
      <Stem />
      <Leaf x={22} y={86} flip />
      <g fill="#E7C15E">{ring(5, 8).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="6.4" />)}</g>
      <g fill="#F0D480">{ring(5, 7).map((p, i) => <ellipse key={i} cx={(p.x + 22) / 2} cy={(p.y + 24) / 2} rx="2.6" ry="3.4" />)}</g>
      <circle cx="22" cy="24" r="3.6" fill="#C99A3E" />
    </>
  ),
  daisy: (
    <>
      <Stem />
      <Leaf x={22} y={84} />
      <g fill="#FDFBF4" stroke="#E7E0CB" strokeWidth="0.6">
        {ring(13, 9.5).map((p, i) => (
          <ellipse key={i} cx={p.x} cy={p.y} rx="4.6" ry="2.4" transform={`rotate(${p.a} ${p.x} ${p.y})`} />
        ))}
      </g>
      <circle cx="22" cy="24" r="5.6" fill="#EBB94C" /><circle cx="22" cy="24" r="3" fill="#D9A538" />
    </>
  ),
  poppy: (
    <>
      <Stem d="M22 130 C 18 96, 26 60, 22 34" />
      <Leaf x={22} y={90} flip />
      <g fill="#E79098">{ring(4, 8, 22, 24).map((p, i) => <ellipse key={i} cx={p.x} cy={p.y} rx="8.5" ry="7" transform={`rotate(${p.a + 90} ${p.x} ${p.y})`} />)}</g>
      <g fill="#EEA6AC" opacity="0.85">{ring(4, 5, 22, 24).map((p, i) => <ellipse key={i} cx={p.x} cy={p.y} rx="5" ry="4.4" transform={`rotate(${p.a + 90} ${p.x} ${p.y})`} />)}</g>
      <circle cx="22" cy="24" r="4.6" fill="#5B4636" />
      <g stroke="#7A5E48" strokeWidth="1">{ring(8, 4.5).map((p, i) => <line key={i} x1={22} y1={24} x2={p.x} y2={p.y} />)}</g>
    </>
  ),
  blush: (
    <>
      <Stem />
      <Leaf x={22} y={88} />
      <g fill="#E7A6AC">{ring(6, 9).map((p, i) => <ellipse key={i} cx={p.x} cy={p.y} rx="5.6" ry="3.6" transform={`rotate(${p.a} ${p.x} ${p.y})`} />)}</g>
      <g fill="#F0C1C5" opacity="0.8">{ring(6, 5).map((p, i) => <ellipse key={i} cx={p.x} cy={p.y} rx="3" ry="2.2" transform={`rotate(${p.a} ${p.x} ${p.y})`} />)}</g>
      <circle cx="22" cy="24" r="4.4" fill="#E0B15E" />
    </>
  ),
  harebell: (
    <>
      <path d="M22 130 C 20 96, 30 64, 24 40" stroke={STEM} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Leaf x={23} y={94} />
      {/* nodding bells */}
      {[[13, 34, -18], [30, 30, 16], [22, 20, -4]].map(([cx, cy, rot], i) => (
        <g key={i} transform={`rotate(${rot} ${cx} ${cy})`}>
          <path d={`M${cx - 6} ${cy - 8} Q ${cx} ${cy + 9} ${cx + 6} ${cy - 8} Q ${cx} ${cy - 2} ${cx - 6} ${cy - 8} Z`} fill="#AEB6DE" />
          <path d={`M${cx - 3} ${cy + 3} L ${cx} ${cy + 7} L ${cx + 3} ${cy + 3}`} fill="#9AA4D3" />
          <line x1={cx} y1={cy - 10} x2={cx} y2={cy - 8} stroke={STEM} strokeWidth="1.6" />
        </g>
      ))}
    </>
  ),
};

export default function FlowerArt({ id, height = 72 }: Props) {
  const art = arts[id];
  if (!art) return null;
  return (
    <svg width={(height * 44) / 132} height={height} viewBox="0 0 44 132" aria-hidden="true">
      {art}
    </svg>
  );
}
