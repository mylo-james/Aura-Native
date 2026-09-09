import {Image} from 'react-native';
const images = [
  require('../../assets/aura/1.png'),
  require('../../assets/aura/2.png'),
  require('../../assets/aura/3.png'),
  require('../../assets/aura/4.png'),
  require('../../assets/aura/5.png'),
  require('../../assets/aura/6.png'),
];
export function Moon({mood, size = 48}: {mood: number; size?: number}) {
  return (
    <Image
      source={images[mood - 1] ?? images[2]}
      style={{width: size, height: size}}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no"
      alt=""
    />
  );
}
