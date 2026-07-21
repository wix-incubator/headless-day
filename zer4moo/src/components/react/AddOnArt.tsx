// Little watercolor-style illustrations for the "finishing touches" add-ons,
// matched by keyword in the add-on's name.
type Props = { name: string; size?: number };

function pick(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('salt')) return 'salt';
  if (n.includes('carrot')) return 'carrot';
  if (n.includes('dandelion')) return 'dandelion';
  if (n.includes('bell') || n.includes('ribbon') || n.includes('wrap')) return 'bell';
  if (n.includes('apple')) return 'apple';
  return 'gift';
}

const arts: Record<string, JSX.Element> = {
  salt: (
    <>
      <polygon points="10,18 24,10 40,16 26,24" fill="#F0C6C1" />
      <path d="M10 18 L26 24 L26 40 L10 34 Z" fill="#E2A39C" />
      <path d="M26 24 L40 16 L40 32 L26 40 Z" fill="#D9968E" />
      <circle cx="17" cy="28" r="1.4" fill="#F0C6C1" opacity=".7" />
      <circle cx="32" cy="26" r="1.2" fill="#F0C6C1" opacity=".6" />
    </>
  ),
  carrot: (
    <>
      <path d="M24 44 L15 18 Q24 14 33 18 Z" fill="#E0965E" />
      <path d="M24 44 L15 18 Q24 14 33 18 Z" fill="none" stroke="#CC8049" stroke-width="1" opacity=".5" />
      <g stroke="#C97D46" stroke-width="1"><line x1="19" y1="22" x2="22" y2="23" /><line x1="26" y1="23" x2="29" y2="22" /><line x1="21" y1="30" x2="24" y2="31" /></g>
      <path d="M24 17 q-6 -10 -11 -9 q3 6 11 9" fill="#6E8A57" />
      <path d="M24 17 q0 -12 3 -13 q2 7 -3 13" fill="#82A265" />
      <path d="M24 17 q6 -10 11 -9 q-3 6 -11 9" fill="#6E8A57" />
    </>
  ),
  dandelion: (
    <>
      <path d="M24 44 C22 34 26 28 24 22" stroke="#6E8A57" stroke-width="2.4" fill="none" stroke-linecap="round" />
      <path d="M24 34 q-8 -1 -11 -6 q6 -1 11 6" fill="#6E8A57" />
      <g stroke="#E8B84B" stroke-width="2.2" stroke-linecap="round">
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} x1={24} y1={18} x2={24 + Math.cos(a) * 11} y2={18 + Math.sin(a) * 11} />;
        })}
      </g>
      <circle cx="24" cy="18" r="6" fill="#F0CE6A" />
    </>
  ),
  bell: (
    <>
      <path d="M16 34 Q16 18 24 15 Q32 18 32 34 Z" fill="#E7C15E" />
      <path d="M14 34 L34 34 L34 37 L14 37 Z" rx="2" fill="#D9AE4E" />
      <circle cx="24" cy="39" r="2.4" fill="#C99A3E" />
      <circle cx="24" cy="13" r="2.2" fill="#C99A3E" />
      <path d="M24 12 q-9 -3 -12 2 q6 3 12 -2" fill="#E4A0A6" />
      <path d="M24 12 q9 -3 12 2 q-6 3 -12 -2" fill="#E4A0A6" />
      <circle cx="24" cy="12" r="2.2" fill="#DC9097" />
    </>
  ),
  apple: (
    <>
      <path d="M22 14 Q10 20 12 32 Q14 40 22 40 Q20 28 22 14 Z" fill="#F4EDDE" stroke="#E4A0A6" stroke-width="2.2" />
      <path d="M26 14 Q38 20 36 32 Q34 40 26 40 Q28 28 26 14 Z" fill="#F4EDDE" stroke="#E4A0A6" stroke-width="2.2" />
      <path d="M23 12 q1 -4 4 -5" stroke="#6E8A57" stroke-width="2" fill="none" stroke-linecap="round" />
      <ellipse cx="19" cy="30" rx="1.2" ry="2" fill="#8A6B4E" /><ellipse cx="29" cy="30" rx="1.2" ry="2" fill="#8A6B4E" />
    </>
  ),
  gift: (
    <>
      <rect x="12" y="20" width="24" height="20" rx="3" fill="#EFE7D6" />
      <rect x="12" y="20" width="24" height="7" rx="3" fill="#E0D6BE" />
      <rect x="22" y="20" width="4" height="20" fill="#E4A0A6" />
      <path d="M24 20 q-8 -8 -11 -3 q5 5 11 3" fill="#E4A0A6" />
      <path d="M24 20 q8 -8 11 -3 q-5 5 -11 3" fill="#E4A0A6" />
    </>
  ),
};

export default function AddOnArt({ name, size = 44 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      {arts[pick(name)]}
    </svg>
  );
}
