import { useEffect } from 'react';
import { useGame } from '../game/store';
import { useAchievements } from '../game/achievements';

/** Mounted once, DOM-side (in `App`, not inside the r3f Canvas) — wires `useGame`'s state
 * transitions into the achievements engine via a plain store subscription, so `useGame`
 * itself never needs to know the achievements engine exists. Only edge-transitions count
 * (checked against `prevState`) so re-renders that leave the game in the same state never
 * re-fire a recorder. */
export function useAchievementsSync(): void {
  useEffect(() => {
    return useGame.subscribe((state, prevState) => {
      if (state.state === 'landed' && prevState.state !== 'landed' && state.activeDestId) {
        useAchievements.getState().recordLanding(state.activeDestId);
      }
      if (state.state === 'confirmed' && prevState.state !== 'confirmed') {
        useAchievements.getState().recordBooked();
      }
    });
  }, []);
}
