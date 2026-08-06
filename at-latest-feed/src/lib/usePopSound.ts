import { useCallback, useRef } from "react";

export function usePopSound() {
  const contextRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    const AudioContextConstructor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextConstructor) return null;
    const context = contextRef.current ?? new AudioContextConstructor();
    contextRef.current = context;
    return context;
  }, []);

  const unlock = useCallback(() => {
    const context = getContext();
    if (context?.state === "suspended") void context.resume();
  }, [getContext]);

  const play = useCallback(() => {
    const context = getContext();
    if (!context) return;
    if (context.state === "suspended") void context.resume();

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(560, now);
    oscillator.frequency.exponentialRampToValueAtTime(820, now + 0.07);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }, [getContext]);

  return { play, unlock };
}
