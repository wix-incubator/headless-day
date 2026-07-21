import { renderHook } from '@testing-library/react';
import { useAchievementsSync } from './useAchievementsSync';
import { useGame } from '../game/store';
import { useAchievements } from '../game/achievements';

beforeEach(() => {
  localStorage.clear();
  useGame.getState().reset();
  useAchievements.getState().reset();
});

test('transitioning into landed records the destination', () => {
  renderHook(() => useAchievementsSync());
  useGame.setState({ state: 'approaching', activeDestId: 'oahu' });
  useGame.setState({ state: 'landed' });
  expect(useAchievements.getState().visitedSpots).toEqual(['oahu']);
});

test('re-entering landed for the same spot does not duplicate the record', () => {
  renderHook(() => useAchievementsSync());
  useGame.setState({ state: 'approaching', activeDestId: 'oahu' });
  useGame.setState({ state: 'landed' });
  useGame.setState({ state: 'flying' });
  useGame.setState({ state: 'approaching', activeDestId: 'oahu' });
  useGame.setState({ state: 'landed' });
  expect(useAchievements.getState().visitedSpots).toEqual(['oahu']);
});

test('transitioning into confirmed records booked-it', () => {
  renderHook(() => useAchievementsSync());
  useGame.setState({ state: 'booking' });
  useGame.setState({ state: 'confirmed' });
  expect(useAchievements.getState().booked).toBe(true);
  expect(useAchievements.getState().unlocked).toContain('booked-it');
});

test('unmounting stops the subscription', () => {
  const { unmount } = renderHook(() => useAchievementsSync());
  unmount();
  useGame.setState({ state: 'approaching', activeDestId: 'bali' });
  useGame.setState({ state: 'landed' });
  expect(useAchievements.getState().visitedSpots).toEqual([]);
});
