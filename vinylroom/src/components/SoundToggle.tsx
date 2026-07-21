"use client";

import { usePlayer } from "./player/PlayerProvider";

/**
 * Persistent sound on/off control. Browsers block unmuted autoplay, so the
 * intro track is usually cued but silent until the first click — this button
 * makes turning sound on an obvious, one-tap action, and pulses until audio
 * has ever played this session so it doesn't get missed.
 */
export default function SoundToggle() {
  const { current, playing, resume } = usePlayer();
  if (!current) return null;

  const label = playing ? "Turn sound off" : "Turn sound on";
  const needsHint = !playing;

  return (
    <button
      type="button"
      onClick={resume}
      aria-label={label}
      title={label}
      className={`relative flex h-10 shrink-0 items-center justify-center gap-1.5 overflow-visible rounded-full border text-cream transition-colors hover:border-amber/80 clickable sm:gap-2 ${
        needsHint
          ? "sound-attention h-9 w-[5.75rem] border-amber px-2 sm:h-10 sm:w-auto sm:max-w-none sm:px-4"
          : "h-9 w-9 border-edge-strong sm:h-10 sm:w-10"
      }`}
    >
      {needsHint && (
        <span className="sound-attention-halo absolute inset-[-5px] rounded-full border border-amber/70 sm:inset-[-8px]" />
      )}
      {playing ? (
        // speaker with sound waves
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19 6a8 8 0 0 1 0 12" opacity="0.6" />
        </svg>
      ) : (
        // muted speaker
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
          <path d="M16 9l5 6M21 9l-5 6" />
        </svg>
      )}
      {needsHint && <span className="truncate whitespace-nowrap text-[0.52rem] font-bold uppercase tracking-[0.08em] text-void sm:text-[0.72rem] sm:tracking-[0.2em]">Sound on</span>}
    </button>
  );
}
