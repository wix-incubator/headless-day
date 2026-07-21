import { useEffect, useRef, useState } from 'react';
import './styles/game.css';
import { useGame } from './game/store';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useAchievementsSync } from './hooks/useAchievementsSync';
import { isWebGLAvailable } from './scene/webgl';
import { GlobeScene } from './scene/GlobeScene';
import { SpeechBubble } from './ui/SpeechBubble';
import { INTRO_LINES, INTRO_CTA } from './ui/dialogue';
import { HintToast, ControlsChip } from './ui/HintToast';
import { AchievementToast } from './ui/AchievementToast';
import { InfoCard } from './ui/InfoCard';
import { BookingCalendar } from './ui/BookingCalendar';
import { ConfirmedCard } from './ui/ConfirmedCard';
import { FallbackView } from './ui/FallbackView';
import { SideNav } from './ui/SideNav';
import { TouchControls } from './ui/TouchControls';
import { dismissSplash } from './ui/splash';
import type { FlightInput } from './game/flight';

export default function App() {
  const state = useGame((g) => g.state);
  const send = useGame((g) => g.send);
  const { getInput } = useKeyboardControls();
  const reducedMotion = useReducedMotion();
  useAchievementsSync();
  const touchInput = useRef<FlightInput>({ dx: 0, dy: 0 });
  const combinedInput = () => {
    const t = touchInput.current;
    return t.dx !== 0 || t.dy !== 0 ? t : getInput();
  };
  // Probe once per mount: a fresh canvas+context on every re-render can evict
  // the live globe's WebGL context once the browser's context cap is hit.
  const [webgl] = useState(() => isWebGLAvailable());

  // Runs regardless of which branch below renders — the splash needs to come
  // down whether the game mounts or WebGL is unavailable and we fall back.
  useEffect(() => {
    dismissSplash();
  }, []);

  if (!webgl) {
    return <FallbackView />;
  }

  return (
    <>
      <GlobeScene getInput={combinedInput} animate={!reducedMotion} />
      <div className="bb-overlay">
        {state === 'intro' && (
          <SpeechBubble lines={INTRO_LINES} cta={INTRO_CTA} instant={reducedMotion}
            onDone={() => send({ type: 'INTRO_DONE' })} />
        )}
        <HintToast />
        <ControlsChip />
        <AchievementToast />
        <InfoCard />
        <SideNav />
        {state === 'booking' && <BookingCalendar />}
        {state === 'confirmed' && <ConfirmedCard />}
        <TouchControls onInput={(i) => { touchInput.current = i; }} />
      </div>
    </>
  );
}
