import { VIXIK_HERO, VIXIK_VICTORY } from './quest';

export type Mood = 'happy' | 'cheer' | 'think';

interface Props {
  says?: string;
  mood?: Mood;
  size?: number;
}

export default function Vixik({ says, mood = 'happy', size = 128 }: Props) {
  const src = mood === 'cheer' ? VIXIK_VICTORY : VIXIK_HERO;
  return (
    <div className="wq-vixik">
      <img
        src={src}
        alt="Wixsus"
        width={size}
        height={size}
        className={`wq-vixik-img wq-mood-${mood}`}
        style={{ width: size, height: size }}
      />
      {says && (
        <div className="wq-bubble" role="status">
          {says}
        </div>
      )}
    </div>
  );
}
