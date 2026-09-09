import {View, ScrollView} from 'react-native';
import {Link, usePathname} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {ReactNode} from 'react';
import {color} from '../theme/tokens';
import {Text} from './ui';
import {useDemo} from '../features/DemoProvider';
export function AppFrame({children}: {children: ReactNode}) {
  const {demo} = useDemo();
  const path = usePathname();
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: color.canvas}}>
      <View
        style={{
          padding: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Text size="large" weight="bold">
          aura
        </Text>
        <Link href="/about">About and support</Link>
      </View>
      <ScrollView contentContainerStyle={{paddingBottom: 24}}>
        {children}
      </ScrollView>
      {demo?.active && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: color.line,
          }}
        >
          {(['/check-in', '/moments', '/patterns'] as const).map(
            (href, index) => (
              <Link
                key={href}
                href={href}
                accessibilityState={{selected: path.startsWith(href)}}
                style={{padding: 12}}
              >
                {['Check-in', 'Moments', 'Patterns'][index]}
              </Link>
            ),
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
