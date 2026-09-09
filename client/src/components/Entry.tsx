import {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import {useRouter} from 'expo-router';
import {useDemo} from '../features/DemoProvider';
import {messageFor, ApiError} from '../lib/http';
import {isEmbedded, standaloneUrl} from '../lib/platform';
import {s} from '../theme/tokens';
import {Anchor, Button, Status, Text, Title} from './ui';
import {Moon} from './Moon';
export function Entry() {
  const {loading, error, expired, refresh, create} = useDemo();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [cookieBlocked, setCookieBlocked] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function start() {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await create();
      // A pending start must not undo navigation away from this entry screen.
      if (mounted.current) router.replace('/check-in');
    } catch (e) {
      setFailure(e);
      if (
        e instanceof ApiError &&
        (e.code === 'cookies_unavailable' ||
          (isEmbedded() && e.status === 403 && /csrf/i.test(e.code)))
      )
        setCookieBlocked(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.page}>
      <View style={[s.center, {paddingTop: 20}]}>
        <View style={[s.row, {alignItems: 'flex-end', paddingVertical: 12}]}>
          <Moon mood={2} size={62} />
          <AnimatedMoon mood={6} size={120} />
          <Moon mood={4} size={62} />
        </View>
        <Title>
          {expired ? 'A fresh start is here.' : 'Make room for how you feel.'}
        </Title>
        <Text tone="muted">
          A small pause to notice your mood, capture a moment, and see what’s
          been part of your days.
        </Text>
      </View>
      {expired && (
        <Status>
          <Text>
            Your temporary demo has ended. Its moments and unsaved drafts are no
            longer available.
          </Text>
        </Status>
      )}
      <View style={s.note}>
        <Title level={2}>A little look inside Aura</Title>
        <Text>
          Start with 24 fictional moments. Add a check-in, explore your journal,
          and try the patterns view.
        </Text>
        <Text size="small" tone="muted">
          This demo lasts 24 hours. Use made-up details. You can reset your demo
          at any time.
        </Text>
      </View>
      {Boolean(failure || error) && (
        <Status error>
          <Text>{messageFor(failure || error)}</Text>
        </Status>
      )}
      {cookieBlocked ? (
        <Anchor href={standaloneUrl()} external target="_top">
          Open Aura directly
        </Anchor>
      ) : (
        <Button
          onPress={() => void (error ? refresh().catch(setFailure) : start())}
          busy={busy || loading}>
          {loading
            ? 'Opening Aura…'
            : busy
              ? 'Preparing your demo…'
              : error
                ? 'Try connecting again'
                : 'Try Aura'}
        </Button>
      )}
      {isEmbedded() && (
        <Anchor href={standaloneUrl()} external target="_top">
          Open demo directly
        </Anchor>
      )}
      <Text size="small" tone="muted" center>
        No account needed. Saved moments stay in this temporary session. Unsaved
        drafts clear when you reload.
      </Text>
    </View>
  );
}
import {AnimatedMoon} from './AnimatedMoon';
