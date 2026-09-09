import {useEffect, useRef} from 'react';
import {AccessibilityInfo, Animated, Easing} from 'react-native';
import {Moon} from './Moon';
export function AnimatedMoon({
  mood,
  size = 116,
}: {
  mood: number;
  size?: number;
}) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    let mounted = true;
    const apply = (reduce: boolean) => {
      animation?.stop();
      value.setValue(0);
      if (!reduce && mounted) {
        animation = Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }),
        ]);
        animation.start();
      }
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(apply);
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      apply,
    );
    return () => {
      mounted = false;
      animation?.stop();
      listener.remove();
    };
  }, [mood, value]);
  return (
    <Animated.View
      style={{
        transform: [
          {
            translateY: value.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -5],
            }),
          },
          {
            rotate: value.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', mood >= 4 ? '4deg' : '-2deg'],
            }),
          },
        ],
      }}
    >
      <Moon mood={mood} size={size} />
    </Animated.View>
  );
}
