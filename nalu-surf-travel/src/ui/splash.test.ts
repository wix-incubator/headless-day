import { dismissSplash } from './splash';

afterEach(() => {
  document.body.innerHTML = '';
});

test('removes #bb-splash from the DOM when present', () => {
  const splash = document.createElement('div');
  splash.id = 'bb-splash';
  document.body.appendChild(splash);

  dismissSplash();

  expect(document.getElementById('bb-splash')).toBeNull();
});

test('does not throw when #bb-splash is absent', () => {
  expect(() => dismissSplash()).not.toThrow();
});

test('is idempotent — does not throw when called twice in a row', () => {
  const splash = document.createElement('div');
  splash.id = 'bb-splash';
  document.body.appendChild(splash);

  dismissSplash();
  expect(() => dismissSplash()).not.toThrow();
  expect(document.getElementById('bb-splash')).toBeNull();
});
