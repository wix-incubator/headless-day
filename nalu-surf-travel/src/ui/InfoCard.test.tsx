import { act, fireEvent, render, screen } from '@testing-library/react';
import { InfoCard } from './InfoCard';
import { useGame } from '../game/store';

// The card mounts 1.05s after `landed` (art-direction §4a: touchdown first, paperwork
// second) — advance past that deferred-mount timer before asserting on its contents.
beforeEach(() => {
  useGame.getState().reset();
  useGame.setState({ state: 'landed', activeDestId: 'ericeira' });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test('renders the destination facts once the touchdown delay elapses', () => {
  render(<InfoCard />);
  expect(screen.queryByRole('heading', { name: /Ericeira/ })).not.toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(1050); });
  expect(screen.getByRole('heading', { name: /Ericeira/ })).toBeInTheDocument();
  expect(screen.getByText('Sep – Nov')).toBeInTheDocument();
  expect(screen.getAllByText(/Coxos/)).toHaveLength(2);
  expect(screen.getByText(/Intermediate/)).toBeInTheDocument();
  expect(screen.getByText(/18°C/)).toBeInTheDocument();
  expect(screen.getByText(/World Surfing Reserve/)).toBeInTheDocument();
});

test('CTA opens booking, take-off returns to flight', () => {
  render(<InfoCard />);
  act(() => { vi.advanceTimersByTime(1050); });
  fireEvent.click(screen.getByRole('button', { name: 'Plan this trip' }));
  expect(useGame.getState().state).toBe('booking');
  expect(useGame.getState().bookingReturnTo).toBe('landed');
});
