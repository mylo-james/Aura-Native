import {useRef, useState} from 'react';
import {View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useDemo} from '../../features/DemoProvider';
import {useEditorGuard} from '../../features/EditorGuard';
import {validateReflection} from '../../features/draft';
import {
  dateLabel,
  influences,
  moodName,
  momentTitle,
  type Moment,
  type Mood,
} from '../../lib/contracts';
import {ApiError, messageFor} from '../../lib/http';
import {confirmDiscard, focusHeading, newOperationId} from '../../lib/platform';
import {Button, Form, Status, Text, Title} from '../../components/ui';
import {Entry} from '../../components/Entry';
import {Moon} from '../../components/Moon';
import {Reflection} from '../../components/Reflection';
import {MoodFields, ReflectionFields} from '../../components/MoodFields';
import {s} from '../../theme/tokens';
export default function MomentRoute() {
  const {id} = useLocalSearchParams<{id: string}>();
  const {demo, generation, read} = useDemo();
  const query = useQuery({
    queryKey: ['moment', generation, id],
    queryFn: ({signal}) =>
      read<Moment>(`/api/moments/${encodeURIComponent(id)}`, signal),
    enabled: !!demo?.active && !!id,
  });
  const router = useRouter();
  if (!demo?.active) return <Entry />;
  if (query.isPending)
    return (
      <View style={s.page}>
        <Title>Your moment</Title>
        <Status>
          <Text>Opening your moment…</Text>
        </Status>
      </View>
    );
  if (query.isError || !query.data)
    return (
      <View style={s.page}>
        <Title>This moment isn’t here.</Title>
        <Status error>
          <Text>
            {query.error instanceof ApiError && query.error.status === 404
              ? 'It may have been removed, or belong to a demo that has ended.'
              : messageFor(query.error)}
          </Text>
        </Status>
        <Button onPress={() => router.replace('/moments')}>
          Back to moments
        </Button>
        {!(query.error instanceof ApiError && query.error.status === 404) && (
          <Button variant="secondary" onPress={() => void query.refetch()}>
            Try loading again
          </Button>
        )}
      </View>
    );
  return <MomentDetail key={`${generation}:${id}`} moment={query.data} />;
}
function MomentDetail({moment}: {moment: Moment}) {
  const {demo, generation, write} = useDemo();
  const router = useRouter();
  const client = useQueryClient();
  const timezone = demo?.timezone ?? 'UTC';
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({
    mood: moment.mood,
    influences: moment.influences,
    title: moment.title,
    body: moment.body,
  });
  const [expectedVersion, setExpectedVersion] = useState(moment.version);
  const [operationId, setOperationId] = useState(newOperationId);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty =
    editing &&
    JSON.stringify(values) !==
      JSON.stringify({
        mood: moment.mood,
        influences: moment.influences,
        title: moment.title,
        body: moment.body,
      });
  const bypass = useEditorGuard(dirty);
  function beginEdit() {
    setValues({
      mood: moment.mood,
      influences: moment.influences,
      title: moment.title,
      body: moment.body,
    });
    setExpectedVersion(moment.version);
    setOperationId(newOperationId());
    setEditing(true);
    setSaved(false);
    setFailure(null);
    focusHeading();
  }
  async function cancel() {
    if (
      !dirty ||
      (await confirmDiscard('Discard the changes to this moment?'))
    ) {
      setEditing(false);
      setFailure(null);
      focusHeading();
    }
  }
  async function save() {
    if (lock.current) return;
    const validation = validateReflection(values.title, values.body);
    if (validation.title || validation.body) return;
    lock.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const result = await write<Moment>(`/api/moments/${moment.id}`, 'PUT', {
        ...values,
        operationId,
        expectedVersion,
      });
      client.setQueryData(['moment', generation, moment.id], result);
      setEditing(false);
      setSaved(true);
      void client.invalidateQueries();
      focusHeading();
    } catch (e) {
      setFailure(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function remove() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFailure(null);
    try {
      try {
        await write<void>(`/api/moments/${moment.id}`, 'DELETE');
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 404)) throw e;
      }
      bypass.current = true;
      client.removeQueries({queryKey: ['moment', generation, moment.id]});
      void client.invalidateQueries({queryKey: ['moments', generation]});
      void client.invalidateQueries({queryKey: ['patterns', generation]});
      router.replace('/moments');
    } catch (e) {
      setFailure(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const errors = failure instanceof ApiError ? failure.fields : undefined;
  const conflict = failure instanceof ApiError && failure.status === 409;
  return (
    <View style={s.page}>
      <View style={s.tight}>
        <Title>
          {editing ? 'A little more to say?' : momentTitle(moment, timezone)}
        </Title>
        <Text tone="muted" size="small">
          {dateLabel(moment.createdAt, timezone, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      </View>
      {saved && (
        <Status>
          <Text>Your changes are saved.</Text>
        </Status>
      )}
      {editing ? (
        <Form onSubmit={() => void save()}>
          <MoodFields
            mood={values.mood}
            selectedInfluences={values.influences}
            onMood={(mood: Mood) => setValues({...values, mood})}
            onInfluence={(id) =>
              setValues({
                ...values,
                influences: values.influences.includes(id)
                  ? values.influences.filter((value) => value !== id)
                  : [...values.influences, id].sort((a, b) => a - b),
              })
            }
          />
          <ReflectionFields
            title={values.title}
            body={values.body}
            onTitle={(title) => setValues({...values, title})}
            onBody={(body) => setValues({...values, body})}
            errors={errors}
          />
          {Boolean(failure) && (
            <Status error>
              <Text>{messageFor(failure)}</Text>
              {conflict && (
                <>
                  <Text size="small">
                    Your changes are still here. Load the saved version before
                    editing again.
                  </Text>
                  <Button
                    variant="secondary"
                    onPress={() =>
                      void confirmDiscard(
                        'Discard your changes and load the saved version?',
                      ).then(async (discard) => {
                        if (!discard) return;
                        await client.invalidateQueries({
                          queryKey: ['moment', generation, moment.id],
                        });
                        setEditing(false);
                        setFailure(null);
                      })
                    }
                  >
                    Load saved version
                  </Button>
                </>
              )}
            </Status>
          )}
          <Button
            type="submit"
            onPress={() => void save()}
            busy={busy}
            disabled={
              conflict ||
              !!(
                validateReflection(values.title, values.body).title ||
                validateReflection(values.title, values.body).body
              )
            }
          >
            {busy ? 'Saving changes…' : 'Save changes'}
          </Button>
          <Button variant="quiet" disabled={busy} onPress={() => void cancel()}>
            Cancel editing
          </Button>
        </Form>
      ) : (
        <>
          <View style={s.row}>
            <Moon mood={moment.mood} size={72} />
            <View style={s.tight}>
              <Title level={2}>{moodName(moment.mood)}</Title>
              <Text size="small" tone="muted">
                A check-in from this day
              </Text>
            </View>
          </View>
          {moment.body ? (
            <Reflection body={moment.body} />
          ) : (
            <Text tone="muted">A moment without words. That counts, too.</Text>
          )}
          {moment.influences.length > 0 && (
            <View style={s.wrap}>
              {moment.influences.map((id) => (
                <View key={id} style={s.tag}>
                  <Text size="small">{influences[id - 1]}</Text>
                </View>
              ))}
            </View>
          )}
          {Boolean(failure) && (
            <Status error>
              <Text>{messageFor(failure)}</Text>
            </Status>
          )}
          {deleting ? (
            <Status>
              <Title level={2}>Delete this moment?</Title>
              <Text>
                This removes it from this demo’s journal and patterns.
              </Text>
              <Button
                variant="danger"
                busy={busy}
                onPress={() => void remove()}
              >
                {busy ? 'Deleting…' : 'Delete moment'}
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onPress={() => setDeleting(false)}
              >
                Keep moment
              </Button>
            </Status>
          ) : (
            <View style={[s.stack, s.rule]}>
              <Button onPress={beginEdit}>Edit moment</Button>
              <Button
                variant="quiet"
                onPress={() => router.replace('/moments')}
              >
                Back to moments
              </Button>
              <Button variant="danger" onPress={() => setDeleting(true)}>
                Delete…
              </Button>
            </View>
          )}
        </>
      )}
    </View>
  );
}
