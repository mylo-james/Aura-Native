import {useEffect} from 'react';
import {Alert, AppState} from 'react-native';
export const newOperationId = () => globalThis.crypto.randomUUID();
export const confirmDiscard = (message: string) =>
  new Promise<boolean>((resolve) =>
    Alert.alert('Discard changes?', message, [
      {text: 'Keep editing', onPress: () => resolve(false), style: 'cancel'},
      {text: 'Discard', onPress: () => resolve(true), style: 'destructive'},
    ]),
  );
export const isEmbedded = () => false;
export const standaloneUrl = () => '';
export function useForeground(callback: () => void) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') callback();
    });
    return () => subscription.remove();
  }, [callback]);
}
export function useUnloadWarning(_dirty: boolean) {
  /* Browser reload has no native equivalent. */
}
export function focusHeading() {
  /* Native route focus is managed by the navigator. */
}
