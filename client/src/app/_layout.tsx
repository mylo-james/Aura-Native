import {Slot} from 'expo-router';
import {Providers} from '../features/DemoProvider';
import {AppFrame} from '../components/AppFrame';
export default function Layout() {
  return (
    <Providers>
      <AppFrame>
        <Slot />
      </AppFrame>
    </Providers>
  );
}
