import { useGame } from './store';
import { VIGNETTES } from '../data/vignettes';

beforeEach(() => useGame.getState().reset());

test('starts in intro over the Pacific', () => {
  expect(useGame.getState().state).toBe('intro');
});

test('tick is a no-op during intro', () => {
  const before = useGame.getState().flight;
  useGame.getState().tick({ dx: 1, dy: 0 }, 1);
  expect(useGame.getState().flight).toEqual(before);
});

test('flying near a destination raises ENTER_RANGE and sets activeDestId', () => {
  const g = useGame.getState();
  g.send({ type: 'INTRO_DONE' });
  useGame.setState({ flight: { lat: 20, lng: -162, headingDeg: 90 } });
  useGame.getState().tick({ dx: 1, dy: 0 }, 0.1);
  expect(useGame.getState().state).toBe('approaching');
  expect(useGame.getState().activeDestId).toBe('oahu');
});

test('flying away again raises EXIT_RANGE and clears activeDestId', () => {
  useGame.getState().send({ type: 'INTRO_DONE' });
  useGame.setState({ state: 'approaching', activeDestId: 'oahu', flight: { lat: 20, lng: -158, headingDeg: 0 } });
  // -130, not -100: -100 sits within landing range of Puerto Escondido (15.86, -97.07).
  useGame.setState({ flight: { lat: 20, lng: -130, headingDeg: 0 } });
  useGame.getState().tick({ dx: 0, dy: 0 }, 0.01);
  expect(useGame.getState().state).toBe('flying');
  expect(useGame.getState().activeDestId).toBeNull();
});

test('OPEN_BOOKING remembers where to return', () => {
  useGame.setState({ state: 'landed', activeDestId: 'bali' });
  useGame.getState().send({ type: 'OPEN_BOOKING' });
  expect(useGame.getState().bookingReturnTo).toBe('landed');
  useGame.getState().send({ type: 'CLOSE_BOOKING', returnTo: useGame.getState().bookingReturnTo });
  expect(useGame.getState().state).toBe('landed');
});

test('LAND parks flight at the destination touchdown coords, not the pin itself', () => {
  useGame.getState().send({ type: 'INTRO_DONE' });
  useGame.setState({ state: 'approaching', activeDestId: 'oahu', flight: { lat: 20, lng: -158, headingDeg: 0 } });
  useGame.getState().send({ type: 'LAND' });
  const g = useGame.getState();
  expect(g.state).toBe('landed');
  expect(g.flight.lat).toBeCloseTo(VIGNETTES.oahu.touchdown.lat);
  expect(g.flight.lng).toBeCloseTo(VIGNETTES.oahu.touchdown.lng);
});

test('taking off stays in flight while still inside the just-left range (no instant re-approach / card flash)', () => {
  // Land at oahu — LAND parks the heli on oahu's touchdown coords, so on takeoff
  // the bird is STILL inside oahu's landing range.
  useGame.getState().send({ type: 'INTRO_DONE' });
  useGame.setState({ state: 'approaching', activeDestId: 'oahu', flight: { lat: 20, lng: -158, headingDeg: 0 } });
  useGame.getState().send({ type: 'LAND' });
  expect(useGame.getState().state).toBe('landed');

  useGame.getState().send({ type: 'TAKE_OFF' });
  expect(useGame.getState().state).toBe('flying');
  // A tick while still parked in oahu's range must NOT bounce straight back to approaching.
  useGame.getState().tick({ dx: 0, dy: 0 }, 0.05);
  expect(useGame.getState().state).toBe('flying');
});

test('after taking off and leaving the range, re-entering it approaches again', () => {
  useGame.getState().send({ type: 'INTRO_DONE' });
  useGame.setState({ state: 'approaching', activeDestId: 'oahu', flight: { lat: 20, lng: -158, headingDeg: 0 } });
  useGame.getState().send({ type: 'LAND' });
  useGame.getState().send({ type: 'TAKE_OFF' });
  // Fly well clear of oahu (suppression should release once out of range)...
  // -130, not -100: -100 sits within landing range of Puerto Escondido (15.86, -97.07).
  useGame.setState({ flight: { lat: 20, lng: -130, headingDeg: 0 } });
  useGame.getState().tick({ dx: 0, dy: 0 }, 0.05);
  expect(useGame.getState().state).toBe('flying');
  // ...then come back into oahu range — now it should approach again.
  useGame.setState({ flight: { lat: 20, lng: -160, headingDeg: 0 } });
  useGame.getState().tick({ dx: 0, dy: 0 }, 0.05);
  expect(useGame.getState().state).toBe('approaching');
  expect(useGame.getState().activeDestId).toBe('oahu');
});

test('flyTo teleports into approaching at the destination', () => {
  useGame.getState().send({ type: 'INTRO_DONE' });
  useGame.getState().flyTo('jbay');
  const g = useGame.getState();
  expect(g.state).toBe('approaching');
  expect(g.activeDestId).toBe('jbay');
  expect(g.flight.lat).toBeCloseTo(-34.05);
});
