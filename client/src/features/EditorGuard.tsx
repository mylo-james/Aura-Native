import {useRef} from 'react';
import {useNavigation} from 'expo-router';
import {usePreventRemove} from 'expo-router/react-navigation';
import {confirmDiscard, useUnloadWarning} from '../lib/platform';

export function useEditorGuard(dirty: boolean) {
  const navigation = useNavigation();
  const bypass = useRef(false);
  useUnloadWarning(dirty);
  usePreventRemove(dirty && !bypass.current, ({data}) => {
    void confirmDiscard('Discard the changes to this moment?').then(
      (discard) => {
        if (discard) navigation.dispatch(data.action);
      },
    );
  });
  return bypass;
}
