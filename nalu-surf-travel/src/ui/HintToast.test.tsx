import { act, render, screen } from '@testing-library/react';
import { HintToast, ControlsChip } from './HintToast';
import { useGame } from '../game/store';

beforeEach(() => useGame.getState().reset());

test('hidden while flying, shows destination while approaching', () => {
  useGame.setState({ state: 'flying' });
  const { rerender } = render(<HintToast />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  useGame.setState({ state: 'approaching', activeDestId: 'oahu' });
  rerender(<HintToast />);
  expect(screen.getByRole('status')).toHaveTextContent(/land at Oahu — North Shore/);
});

test('landing fades the toast out over 150ms instead of an instant unmount', () => {
  vi.useFakeTimers();
  try {
    useGame.setState({ state: 'approaching', activeDestId: 'oahu' });
    const { rerender } = render(<HintToast />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    useGame.setState({ state: 'landed' });
    rerender(<HintToast />);
    expect(screen.getByRole('status')).toHaveClass('bb-toast--hiding');

    act(() => { vi.advanceTimersByTime(150); });
    rerender(<HintToast />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

test('touch devices see a tap hint instead of the Space key, and no keyboard chip', () => {
  const original = window.matchMedia;
  try {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    useGame.setState({ state: 'approaching', activeDestId: 'oahu' });
    render(<HintToast />);
    expect(screen.getByRole('status')).toHaveTextContent(/Tap Land/);

    useGame.setState({ state: 'flying' });
    render(<ControlsChip />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  } finally {
    window.matchMedia = original;
  }
});
