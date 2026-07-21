import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { TouchControls } from './TouchControls';
import { useGame } from '../game/store';

beforeEach(() => useGame.getState().reset());

test('d-pad presses produce input vectors', () => {
  const onInput = vi.fn();
  useGame.setState({ state: 'flying' });
  render(<TouchControls onInput={onInput} forceVisible />);
  fireEvent.pointerDown(screen.getByRole('button', { name: 'fly right' }));
  expect(onInput).toHaveBeenLastCalledWith({ dx: 1, dy: 0 });
  fireEvent.pointerUp(screen.getByRole('button', { name: 'fly right' }));
  expect(onInput).toHaveBeenLastCalledWith({ dx: 0, dy: 0 });
});

test('Land only works while approaching', () => {
  useGame.setState({ state: 'flying' });
  render(<TouchControls onInput={() => {}} forceVisible />);
  const land = screen.getByRole('button', { name: 'Land' });
  expect(land).toBeDisabled();
  act(() => useGame.setState({ state: 'approaching', activeDestId: 'oahu' }));
  expect(screen.getByRole('button', { name: 'Land' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Land' }));
  expect(useGame.getState().state).toBe('landed');
});
