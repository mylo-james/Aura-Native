import {View} from 'react-native';
import {useRouter} from 'expo-router';
import {Title, Text, Button} from '../components/ui';
import {s} from '../theme/tokens';
export default function NotFound() {
  const router = useRouter();
  return (
    <View style={s.page}>
      <Title>A little off the path.</Title>
      <Text>This page isn’t here. Your moments are still waiting in Aura.</Text>
      <Button onPress={() => router.replace('/')}>Back to Aura</Button>
    </View>
  );
}
