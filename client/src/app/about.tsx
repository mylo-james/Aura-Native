import {useState} from 'react';
import {View} from 'react-native';
import {useRouter} from 'expo-router';
import {useDemo} from '../features/DemoProvider';
import {dateLabel} from '../lib/contracts';
import {messageFor} from '../lib/http';
import {Anchor, Button, Status, Text, Title} from '../components/ui';
import {s} from '../theme/tokens';
import {AppearanceSettings} from '../components/Appearance';
export default function About() {
  const {demo, reset} = useDemo();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const router = useRouter();
  async function resetDemo() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await reset();
      setConfirm(false);
      router.replace('/check-in');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.page}>
      <View style={s.tight}>
        <Title>A little about Aura.</Title>
        <Text tone="muted">
          A place to check in, keep a moment, and notice what shows up.
        </Text>
      </View>
      <AppearanceSettings />
      <View style={s.stack}>
        <Title level={2}>Your temporary demo</Title>
        <Text>
          Aura starts with 24 fictional moments so you can explore. Use made-up
          details when you add your own. This is a portfolio demonstration, not
          a private health record.
        </Text>
        <Text>
          Saved moments stay on the demo server for this session. The session
          lasts 24 hours from when it starts. Resetting removes your demo’s
          moments and starts fresh.
        </Text>
        <Text size="small" tone="muted">
          Unsaved drafts stay in memory while you move between tabs. Reloading
          the page clears them.
        </Text>
        {demo?.active && demo.expiresAt && (
          <Text size="small" tone="muted">
            This demo ends{' '}
            {dateLabel(demo.expiresAt, demo.timezone ?? 'UTC', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}{' '}
            ({demo.timezone}).
          </Text>
        )}
        {demo?.active &&
          (confirm ? (
            <Status>
              <Title level={2}>Start fresh?</Title>
              <Text>
                This deletes this demo’s moments and unsaved changes, then
                brings back the fictional starting journal.
              </Text>
              <Button
                variant="danger"
                busy={busy}
                onPress={() => void resetDemo()}>
                {busy ? 'Resetting your demo…' : 'Reset this demo'}
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onPress={() => setConfirm(false)}>
                Keep my demo
              </Button>
            </Status>
          ) : (
            <Button variant="quiet" onPress={() => setConfirm(true)}>
              Reset demo…
            </Button>
          ))}
        {Boolean(error) && (
          <Status error>
            <Text>{messageFor(error)}</Text>
          </Status>
        )}
      </View>
      <View style={[s.stack, s.rule]}>
        <Title level={2}>When you need support</Title>
        <Text>
          Aura is a reflection tool. It doesn’t provide diagnosis, treatment,
          crisis monitoring, or emergency help.
        </Text>
        <Text weight="bold">In the United States</Text>
        <Text>
          Call or text 988 to reach the 988 Suicide & Crisis Lifeline. You can
          also chat through its official website.
        </Text>
        <Anchor href="tel:988">Call 988</Anchor>
        <Anchor href="sms:988">Text 988</Anchor>
        <Anchor href="https://988lifeline.org/" external>
          Visit the 988 Lifeline
        </Anchor>
        <Text size="small" tone="muted">
          988 is a US resource. Outside the US, use your local crisis service or
          emergency number. If there is immediate danger, contact local
          emergency services.
        </Text>
      </View>
      <View style={[s.stack, s.rule]}>
        <Title level={2}>One app, still growing</Title>
        <Text>
          Aura began as a mobile project. This version brings its original
          character and mood journal into a working web demo. Native apps and
          personal accounts are future work.
        </Text>
        <Button
          variant="secondary"
          onPress={() => router.replace(demo?.active ? '/check-in' : '/')}>
          Back to Aura
        </Button>
      </View>
    </View>
  );
}
