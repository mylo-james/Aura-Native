import {useRef, useState} from 'react';
import {View} from 'react-native';
import {useRouter} from 'expo-router';
import {useQueryClient} from '@tanstack/react-query';
import {useDemo} from '../features/DemoProvider';
import {validateReflection, draftDirty} from '../features/draft';
import {ApiError, messageFor} from '../lib/http';
import {focusHeading, useUnloadWarning} from '../lib/platform';
import {moodName, type Moment} from '../lib/contracts';
import {Entry} from '../components/Entry';
import {MoodFields, ReflectionFields} from '../components/MoodFields';
import {Button, Form, Status, Text, Title} from '../components/ui';
import {s} from '../theme/tokens';
export default function CheckIn() {
  const {generation} = useDemo();
  return <CheckInForGeneration key={generation ?? 'inactive'} />;
}
function CheckInForGeneration() {
  const {demo, draft, dispatch, write, clearDraft, generation} = useDemo();
  const client = useQueryClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState<Moment | null>(null);
  const savedGeneration = useRef(generation);
  useUnloadWarning(draftDirty(draft));
  async function save() {
    if (lock.current || !draft.mood) return;
    const validation = validateReflection(draft.title, draft.body);
    if (validation.title || validation.body) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await write<Moment>('/api/moments', 'POST', {
        mood: draft.mood,
        influences: draft.influences,
        title: draft.title,
        body: draft.body,
        operationId: draft.operationId,
      });
      savedGeneration.current = generation;
      setSaved(result);
      clearDraft();
      void client.invalidateQueries();
      focusHeading();
    } catch (e) {
      setError(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!demo?.active) return <Entry />;
  if (saved && savedGeneration.current === generation)
    return (
      <View style={s.page}>
        <Title>A moment, kept.</Title>
        <Status>
          <Text>Your check-in is saved.</Text>
        </Status>
        <Text tone="muted">
          You made a little room for yourself. Come back whenever you want to.
        </Text>
        <Button
          onPress={() => {
            router.push(`/moments/${saved.id}`);
            setSaved(null);
          }}
        >
          View this moment
        </Button>
        <Button
          variant="secondary"
          onPress={() => {
            setSaved(null);
            focusHeading();
          }}
        >
          Another check-in
        </Button>
      </View>
    );
  const errors = error instanceof ApiError ? error.fields : undefined;
  return (
    <View style={s.page}>
      <View style={s.tight}>
        <Title>
          {draft.step === 'mood'
            ? 'How are you, right now?'
            : 'Anything on your mind?'}
        </Title>
        <Text tone="muted">
          {draft.step === 'mood'
            ? 'There’s room for every kind of day.'
            : 'Leave a little note for this moment, or save it as it is.'}
        </Text>
      </View>
      <Form
        onSubmit={() =>
          draft.step === 'mood'
            ? draft.mood &&
              (dispatch({type: 'step', value: 'reflection'}), focusHeading())
            : void save()
        }
      >
        {draft.step === 'mood' ? (
          <MoodFields
            mood={draft.mood}
            selectedInfluences={draft.influences}
            onMood={(value) => {
              setError(null);
              dispatch({type: 'mood', value});
            }}
            onInfluence={(value) => dispatch({type: 'influence', value})}
          />
        ) : (
          <>
            <Status>
              <Text>
                {moodName(draft.mood ?? 3)}
                {draft.influences.length > 0
                  ? ` · ${draft.influences.length} influence${draft.influences.length === 1 ? '' : 's'}`
                  : ''}
              </Text>
            </Status>
            <ReflectionFields
              title={draft.title}
              body={draft.body}
              onTitle={(value) =>
                dispatch({type: 'text', field: 'title', value})
              }
              onBody={(value) => dispatch({type: 'text', field: 'body', value})}
              errors={errors}
            />
          </>
        )}
        {Boolean(error) && (
          <Status error>
            <Text>{messageFor(error)}</Text>
          </Status>
        )}
        {draft.step === 'mood' ? (
          <>
            <Button
              type="submit"
              disabled={!draft.mood}
              onPress={() => {
                if (draft.mood) {
                  dispatch({type: 'step', value: 'reflection'});
                  focusHeading();
                }
              }}
            >
              Continue
            </Button>
            {!draft.mood && (
              <Text size="small" tone="muted" center>
                Choose the mood that feels closest.
              </Text>
            )}
          </>
        ) : (
          <>
            <Button
              type="submit"
              onPress={() => void save()}
              busy={busy}
              disabled={
                !!(
                  validateReflection(draft.title, draft.body).title ||
                  validateReflection(draft.title, draft.body).body
                )
              }
            >
              {busy ? 'Saving your moment…' : 'Save moment'}
            </Button>
            <Button
              variant="quiet"
              disabled={busy}
              onPress={() => {
                dispatch({type: 'step', value: 'mood'});
                focusHeading();
              }}
            >
              Back to your mood
            </Button>
          </>
        )}
      </Form>
    </View>
  );
}
