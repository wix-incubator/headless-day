import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // Pin to UTC so time-formatted assertions (e.g. BookingCalendar slot labels)
    // don't depend on the host machine's local timezone.
    env: { TZ: 'UTC' },
  },
});
