import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpeechBubble } from './SpeechBubble';

test('advances through lines and fires onDone from the CTA', async () => {
  const user = userEvent.setup();
  const onDone = vi.fn();
  render(<SpeechBubble lines={['one', 'two']} cta="Go!" onDone={onDone} instant />);
  expect(screen.getByText('one')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Go!' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /next/i }));
  expect(screen.getByText('two')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Go!' }));
  expect(onDone).toHaveBeenCalledOnce();
});

test('clicking "Skip intro" fires onDone immediately, even on the first line', async () => {
  const user = userEvent.setup();
  const onDone = vi.fn();
  render(<SpeechBubble lines={['one', 'two']} cta="Go!" onDone={onDone} instant />);
  expect(screen.getByText('one')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Skip intro' }));
  expect(onDone).toHaveBeenCalledOnce();
});
