import { act, render, screen } from '@testing-library/react';
import { AchievementToast } from './AchievementToast';
import { useAchievements } from '../game/achievements';

beforeEach(() => {
  localStorage.clear();
  useAchievements.getState().reset();
});

test('hidden when nothing is queued', () => {
  render(<AchievementToast />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('shows the first queued achievement, Nalu-voiced, sentence case', () => {
  useAchievements.getState().recordLanding('oahu');
  render(<AchievementToast />);
  const toast = screen.getByRole('status');
  expect(toast).toHaveTextContent('🛬 Achievement unlocked · First Landing');
});

test('auto-dismisses after ~4s and advances to the next queued achievement', () => {
  vi.useFakeTimers();
  try {
    useAchievements.getState().recordLanding('oahu');
    useAchievements.getState().collectCoin('arctic');
    const { rerender } = render(<AchievementToast />);
    expect(screen.getByRole('status')).toHaveTextContent('First Landing');

    act(() => { vi.advanceTimersByTime(4000); });
    rerender(<AchievementToast />);
    expect(screen.getByRole('status')).toHaveTextContent('First Coin');

    act(() => { vi.advanceTimersByTime(4000); });
    rerender(<AchievementToast />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});
