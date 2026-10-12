'use client';
import { useSyncExternalStore } from 'react';
const query = '(prefers-reduced-motion: reduce)';
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
export function useReducedMotion() {
  // The server and first hydration render always expose the complete static story.
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => true);
}
