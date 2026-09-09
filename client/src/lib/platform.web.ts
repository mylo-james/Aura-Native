import {useEffect} from 'react';
export const newOperationId = () => crypto.randomUUID();
export const confirmDiscard = (message: string) =>
  Promise.resolve(window.confirm(message));
export const isEmbedded = () => window.parent !== window;
export const standaloneUrl = () => window.location.origin;
export function useForeground(callback: () => void) {
  useEffect(() => {
    const visible = () => {
      if (document.visibilityState === 'visible') callback();
    };
    window.addEventListener('focus', callback);
    window.addEventListener('online', callback);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('focus', callback);
      window.removeEventListener('online', callback);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [callback]);
}
export function useUnloadWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}
export function focusHeading() {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('main h1')?.focus();
    window.scrollTo({top: 0, behavior: 'instant'});
  });
}
