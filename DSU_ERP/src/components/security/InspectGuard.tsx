'use client';
import { useEffect } from 'react';

/** Blocks the right-click menu and the keyboard shortcuts for developer tools,
 * view-source and save-page on every page. This deters casual inspection only:
 * browsers always let a determined user open their own tools (for example from
 * the browser menu), so real protection stays on the server (session checks,
 * no secrets sent to the client). Developers can opt out locally with
 * NEXT_PUBLIC_ALLOW_INSPECT=1 in .env.local. */
export function InspectGuard() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ALLOW_INSPECT === '1') return;
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const blocked =
        key === 'f12' ||
        (ctrl && event.shiftKey && ['i', 'j', 'c', 'k', 'e', 'm'].includes(key)) || // DevTools panels and device mode
        (ctrl && event.altKey && ['i', 'j', 'c', 'u'].includes(key)) || // macOS variants
        (ctrl && ['u', 's'].includes(key)); // View source, save page
      if (blocked) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const onDragStart = (event: DragEvent) => {
      if ((event.target as HTMLElement | null)?.tagName === 'IMG') event.preventDefault();
    };
    document.addEventListener('contextmenu', onContextMenu, true);
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('dragstart', onDragStart, true);
    return () => {
      document.removeEventListener('contextmenu', onContextMenu, true);
      window.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('dragstart', onDragStart, true);
    };
  }, []);
  return null;
}
