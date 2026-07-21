import { transition } from './machine';

test.each([
  ['intro', { type: 'INTRO_DONE' }, 'flying'],
  ['flying', { type: 'ENTER_RANGE', destId: 'oahu' }, 'approaching'],
  ['approaching', { type: 'EXIT_RANGE' }, 'flying'],
  ['approaching', { type: 'LAND' }, 'landed'],
  ['landed', { type: 'TAKE_OFF' }, 'flying'],
  ['landed', { type: 'OPEN_BOOKING' }, 'booking'],
  ['flying', { type: 'OPEN_BOOKING' }, 'booking'],
  ['booking', { type: 'BOOKED' }, 'confirmed'],
  ['booking', { type: 'CLOSE_BOOKING', returnTo: 'landed' }, 'landed'],
  ['booking', { type: 'CLOSE_BOOKING', returnTo: 'flying' }, 'flying'],
  ['confirmed', { type: 'DONE' }, 'flying'],
] as const)('%s + %o → %s', (from, ev, to) => {
  expect(transition(from, ev as any)).toBe(to);
});

test('invalid events do not change state', () => {
  expect(transition('flying', { type: 'LAND' })).toBe('flying');
  expect(transition('intro', { type: 'BOOKED' })).toBe('intro');
});
