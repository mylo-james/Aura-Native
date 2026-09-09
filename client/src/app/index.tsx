import {Redirect} from 'expo-router';
import {useDemo} from '../features/DemoProvider';
import {Entry} from '../components/Entry';
export default function Index() {
  const {demo} = useDemo();
  return demo?.active ? <Redirect href="/check-in" /> : <Entry />;
}
