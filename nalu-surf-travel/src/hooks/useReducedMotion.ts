import { useSyncExternalStore } from 'react';

const query = () => window.matchMedia('(prefers-reduced-motion: reduce)');

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => { const mq = query(); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb); },
    () => query().matches,
    () => false,
  );
}
