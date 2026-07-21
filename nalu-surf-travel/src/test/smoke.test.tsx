import { render, screen } from '@testing-library/react';

test('smoke: renders JSX under jsdom', () => {
  render(<h1>Nalu Surf Travel</h1>);
  expect(screen.getByRole('heading', { name: 'Nalu Surf Travel' })).toBeInTheDocument();
});
