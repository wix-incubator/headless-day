import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SideNav } from './SideNav';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { useGame } from '../game/store';
import { useAchievements } from '../game/achievements';

// Mounts the real keyboard hook alongside SideNav, same as App does, so the
// Esc-double-fire regression (drawer close + game's own Esc handler both
// reacting to the same keydown) can actually reproduce.
function AppLike() {
  useKeyboardControls();
  return <SideNav />;
}

beforeEach(() => {
  localStorage.clear();
  useGame.getState().reset();
  useGame.setState({ state: 'flying' });
  useAchievements.getState().reset();
});

test('quick-jump flies Nalu to the destination and closes', async () => {
  const user = userEvent.setup();
  render(<SideNav />);
  await user.click(screen.getByRole('button', { name: /menu/i }));
  await user.click(screen.getByRole('button', { name: /Jeffreys Bay/ }));
  expect(useGame.getState().activeDestId).toBe('jbay');
  expect(useGame.getState().state).toBe('approaching');
  expect(screen.queryByText(/The agency/i)).not.toBeInTheDocument();
});

test('my booking: empty state opens the calendar directly', async () => {
  const user = userEvent.setup();
  render(<SideNav />);
  await user.click(screen.getByRole('button', { name: /menu/i }));
  await user.click(screen.getByRole('button', { name: /book a session/i }));
  expect(useGame.getState().state).toBe('booking');
});

test('my booking: book a session works even from the intro (no direct intro+OPEN_BOOKING transition)', async () => {
  useGame.setState({ state: 'intro' });
  const user = userEvent.setup();
  render(<SideNav />);
  await user.click(screen.getByRole('button', { name: /menu/i }));
  await user.click(screen.getByRole('button', { name: /book a session/i }));
  expect(useGame.getState().state).toBe('booking');
});

test('Esc closes the drawer without also taking off (no double-fire into the game hook)', async () => {
  useGame.setState({ state: 'landed', activeDestId: 'oahu' });
  const user = userEvent.setup();
  render(<AppLike />);
  await user.click(screen.getByRole('button', { name: /menu/i }));
  expect(screen.getByRole('navigation', { name: /site menu/i })).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('navigation', { name: /site menu/i })).not.toBeInTheDocument();
  expect(useGame.getState().state).toBe('landed');
});

test('drawer exposes aria-controls/id for the menu toggle', async () => {
  const user = userEvent.setup();
  render(<SideNav />);
  const menu = screen.getByRole('button', { name: /menu/i });
  expect(menu).toHaveAttribute('aria-controls', 'bb-drawer');
  await user.click(menu);
  const nav = screen.getByRole('navigation', { name: /site menu/i });
  expect(nav).toHaveAttribute('id', 'bb-drawer');
});

test('my booking: shows the saved booking', async () => {
  localStorage.setItem('birdie-breaks.myBooking.v1',
    JSON.stringify({ bookingId: 'bk-1', startISO: '2026-07-14T09:00:00Z', destName: 'Bali — Uluwatu' }));
  const user = userEvent.setup();
  render(<SideNav />);
  await user.click(screen.getByRole('button', { name: /menu/i }));
  expect(screen.getByText(/about Bali — Uluwatu/)).toBeInTheDocument();
});

test('achievements: no badges yet shows the empty-state line, never a locked one', async () => {
  const user = userEvent.setup();
  render(<SideNav />);
  await user.click(screen.getByRole('button', { name: /menu/i }));
  expect(screen.getByText(/No badges yet — explore to discover secrets\./)).toBeInTheDocument();
  expect(screen.getByText(/Keep exploring — there are secrets to find\./)).toBeInTheDocument();
  expect(screen.queryByText(/Globetrotter/)).not.toBeInTheDocument();
});

test('achievements: lists only earned badges (emoji + title + earnedHint), with the explore line always present', async () => {
  useAchievements.getState().recordLanding('oahu');
  const user = userEvent.setup();
  render(<SideNav />);
  await user.click(screen.getByRole('button', { name: /menu/i }));
  expect(screen.getByText(/🛬/)).toBeInTheDocument();
  expect(screen.getByText('First Landing')).toBeInTheDocument();
  expect(screen.getByText(/Touched down at your first break/)).toBeInTheDocument();
  expect(screen.queryByText(/No badges yet/)).not.toBeInTheDocument();
  // still-locked achievements never render, even alongside earned ones
  expect(screen.queryByText(/Globetrotter/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Treasure Hunter/)).not.toBeInTheDocument();
  expect(screen.getByText(/Keep exploring — there are secrets to find\./)).toBeInTheDocument();
});
