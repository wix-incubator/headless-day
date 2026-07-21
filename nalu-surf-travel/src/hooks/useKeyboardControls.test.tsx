import { renderHook, act } from '@testing-library/react';
import { useKeyboardControls } from './useKeyboardControls';
import { useGame } from '../game/store';

beforeEach(() => useGame.getState().reset());

const key = (type: 'keydown' | 'keyup', keyName: string) =>
  act(() => { window.dispatchEvent(new KeyboardEvent(type, { key: keyName })); });

test('arrow keys map to a flight input vector', () => {
  const { result } = renderHook(() => useKeyboardControls());
  key('keydown', 'ArrowUp');
  key('keydown', 'ArrowRight');
  expect(result.current.getInput()).toEqual({ dx: 1, dy: 1 });
  key('keyup', 'ArrowUp');
  expect(result.current.getInput()).toEqual({ dx: 1, dy: 0 });
});

test('Space lands when approaching and takes off when landed', () => {
  renderHook(() => useKeyboardControls());
  useGame.setState({ state: 'approaching', activeDestId: 'oahu' });
  key('keydown', ' ');
  expect(useGame.getState().state).toBe('landed');
  key('keydown', ' ');
  expect(useGame.getState().state).toBe('flying');
});

test('Escape closes booking back to where it came from', () => {
  renderHook(() => useKeyboardControls());
  useGame.setState({ state: 'booking', bookingReturnTo: 'landed' });
  key('keydown', 'Escape');
  expect(useGame.getState().state).toBe('landed');
});

test('Space on a focused button activates it instead of steering the bird', () => {
  renderHook(() => useKeyboardControls());
  useGame.setState({ state: 'approaching', activeDestId: 'oahu' });
  const button = document.createElement('button');
  document.body.appendChild(button);
  button.focus();
  key('keydown', ' ');
  expect(useGame.getState().state).toBe('approaching');
  button.remove();
});

test('typing in a form field never steers the bird', () => {
  const { result } = renderHook(() => useKeyboardControls());
  const input = document.createElement('input');
  document.body.appendChild(input);
  input.focus();
  key('keydown', 'ArrowRight');
  expect(result.current.getInput()).toEqual({ dx: 0, dy: 0 });
  input.remove();
});
