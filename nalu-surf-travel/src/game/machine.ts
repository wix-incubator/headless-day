export type GameStateName = 'intro' | 'flying' | 'approaching' | 'landed' | 'booking' | 'confirmed';

export type GameEvent =
  | { type: 'INTRO_DONE' }
  | { type: 'ENTER_RANGE'; destId: string }
  | { type: 'EXIT_RANGE' }
  | { type: 'LAND' }
  | { type: 'TAKE_OFF' }
  | { type: 'OPEN_BOOKING' }
  | { type: 'BOOKED' }
  | { type: 'CLOSE_BOOKING'; returnTo: 'flying' | 'landed' }
  | { type: 'DONE' };

export function transition(state: GameStateName, ev: GameEvent): GameStateName {
  switch (state) {
    case 'intro':
      return ev.type === 'INTRO_DONE' ? 'flying' : state;
    case 'flying':
      if (ev.type === 'ENTER_RANGE') return 'approaching';
      if (ev.type === 'OPEN_BOOKING') return 'booking';
      return state;
    case 'approaching':
      if (ev.type === 'EXIT_RANGE') return 'flying';
      if (ev.type === 'LAND') return 'landed';
      if (ev.type === 'OPEN_BOOKING') return 'booking';
      return state;
    case 'landed':
      if (ev.type === 'TAKE_OFF') return 'flying';
      if (ev.type === 'OPEN_BOOKING') return 'booking';
      return state;
    case 'booking':
      if (ev.type === 'BOOKED') return 'confirmed';
      if (ev.type === 'CLOSE_BOOKING') return ev.returnTo;
      return state;
    case 'confirmed':
      return ev.type === 'DONE' ? 'flying' : state;
  }
}
