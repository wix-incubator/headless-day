import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import type { FlightInput } from '../game/flight';

const FORM_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** Space/Enter on a focused button or link should activate it, not steer the bird. */
function isInteractiveElementFocused(): boolean {
  const el = document.activeElement;
  return !!el && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button');
}

export function useKeyboardControls(): { getInput: () => FlightInput } {
  const pressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    const inForm = () => FORM_TAGS.has(document.activeElement?.tagName ?? '');

    const onKeyDown = (e: KeyboardEvent) => {
      if (inForm()) return;
      if (e.key.startsWith('Arrow')) { pressed.current.add(e.key); e.preventDefault(); return; }
      const { state, send, bookingReturnTo } = useGame.getState();
      if (e.key === ' ') {
        if (isInteractiveElementFocused()) return;
        if (state === 'approaching') send({ type: 'LAND' });
        else if (state === 'landed') send({ type: 'TAKE_OFF' });
        else if (state === 'confirmed') send({ type: 'DONE' });
        e.preventDefault();
      } else if (e.key === 'Escape') {
        if (state === 'booking') send({ type: 'CLOSE_BOOKING', returnTo: bookingReturnTo });
        else if (state === 'landed') send({ type: 'TAKE_OFF' });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => pressed.current.delete(e.key);
    const onBlur = () => pressed.current.clear();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return {
    getInput: () => {
      const p = pressed.current;
      const dx = ((p.has('ArrowRight') ? 1 : 0) - (p.has('ArrowLeft') ? 1 : 0)) as -1 | 0 | 1;
      const dy = ((p.has('ArrowUp') ? 1 : 0) - (p.has('ArrowDown') ? 1 : 0)) as -1 | 0 | 1;
      return { dx, dy };
    },
  };
}
