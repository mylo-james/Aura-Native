import {useEffect, useRef} from 'react';
import {useUnloadWarning} from '../lib/platform';

const discardMessage = 'Discard the changes to this moment?';

export function useEditorGuard(dirty: boolean) {
  const bypass = useRef(false);
  useUnloadWarning(dirty);
  useEffect(() => {
    if (!dirty) return;
    // Expo's Slot can unmount a screen while restoring root history. Ask at
    // the browser's pre-commit boundary, before Expo receives popstate.
    const traversal = (event: NavigateEvent) => {
      if (
        bypass.current ||
        event.navigationType !== 'traverse' ||
        !event.cancelable
      )
        return;
      if (!window.confirm(discardMessage)) event.preventDefault();
    };
    // Stop an owned link before React/Expo turns it into a route mutation.
    const link = (event: MouseEvent) => {
      if (
        bypass.current ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href]')
          : null;
      if (
        !anchor ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      )
        return;
      if (new URL(anchor.href).origin !== window.location.origin) return;
      if (!window.confirm(discardMessage)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.navigation?.addEventListener('navigate', traversal);
    document.addEventListener('click', link, true);
    return () => {
      window.navigation?.removeEventListener('navigate', traversal);
      document.removeEventListener('click', link, true);
    };
  }, [dirty]);
  return bypass;
}
