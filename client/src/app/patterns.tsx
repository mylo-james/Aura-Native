import {useState} from 'react';
import {View} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useDemo} from '../features/DemoProvider';
import {moods, type Patterns as PatternData} from '../lib/contracts';
import {messageFor} from '../lib/http';
import {Entry} from '../components/Entry';
import {
  Button,
  Choice,
  ChoiceGroup,
  Status,
  Text,
  Title,
} from '../components/ui';
import {Moon} from '../components/Moon';
import {s} from '../theme/tokens';
export default function Patterns() {
  const {demo, generation, read} = useDemo();
  const [days, setDays] = useState<7 | 30>(7);
  const query = useQuery({
    queryKey: ['patterns', generation, days],
    queryFn: ({signal}) =>
      read<PatternData>(`/api/patterns?days=${days}`, signal),
    enabled: !!demo?.active,
  });
  if (!demo?.active) return <Entry />;
  const data = query.data;
  return (
    <View style={s.page}>
      <View style={s.tight}>
        <Title>Notice the little things.</Title>
        <Text tone="muted">A reflection of your check-ins.</Text>
      </View>
      <ChoiceGroup label="Time window" radio>
        {([7, 30] as const).map((value) => (
          <Choice
            key={value}
            label={`${value} days`}
            selected={days === value}
            onPress={() => setDays(value)}
            kind="radio"
            compact
          >
            <Text>{value} days</Text>
          </Choice>
        ))}
      </ChoiceGroup>
      {query.isPending && (
        <Status>
          <Text>Gathering your patterns…</Text>
        </Status>
      )}
      {query.isError && (
        <Status error>
          <Text>{messageFor(query.error)}</Text>
          <Button variant="secondary" onPress={() => void query.refetch()}>
            Try loading again
          </Button>
        </Status>
      )}
      {data && (
        <>
          <View style={s.tight}>
            <Title level={2}>
              {data.count} check-in{data.count === 1 ? '' : 's'}
            </Title>
            <Text tone="muted" size="small">
              {formatDay(data.startDate)} to {formatDay(data.endDate)} ·{' '}
              {data.timezone}
            </Text>
          </View>
          {data.state === 'empty' ? (
            <Status>
              <Text>
                No check-ins in this window yet. Each moment you save can give
                you something to look back on.
              </Text>
            </Status>
          ) : (
            <>
              <View style={s.stack}>
                <Title level={2}>
                  {days === 7 ? 'A week of feelings' : 'A month of feelings'}
                </Title>
                <View style={s.choiceRow}>
                  {moods.map((mood) => {
                    const item = data.moods.find(
                      (entry) => entry.mood === mood.value,
                    );
                    return (
                      <View
                        key={mood.value}
                        style={[s.center, {flex: 1, gap: 6}]}
                      >
                        <Moon mood={mood.value} size={42} />
                        <Text weight="bold">{item?.count ?? 0}</Text>
                        <Text size="small">{mood.name}</Text>
                        <Text size="small" tone="muted">
                          {Math.round(item?.percent ?? 0)}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              <View style={[s.stack, s.rule]}>
                <Title level={2}>What showed up</Title>
                {data.influences
                  .filter((item) => item.count > 0)
                  .sort((a, b) => b.count - a.count || a.id - b.id)
                  .map((item) => (
                    <View key={item.id} style={s.tight}>
                      <View style={s.between}>
                        <Text>{item.name}</Text>
                        <Text size="small" tone="muted">
                          {item.count} of {data.denominator} ·{' '}
                          {Math.round(item.percent)}%
                        </Text>
                      </View>
                      <View style={s.barTrack} accessibilityElementsHidden>
                        <View
                          style={[
                            s.bar,
                            {
                              width: `${Math.max(0, Math.min(100, item.percent))}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                {data.influences.every((item) => item.count === 0) && (
                  <Text tone="muted">
                    No influences selected in this window.
                  </Text>
                )}
              </View>
              {data.state === 'insufficient' && (
                <Status>
                  <Text>
                    One moment is a beginning. A few more can give you more to
                    reflect on.
                  </Text>
                </Status>
              )}
              <Text size="small" tone="muted">
                Each check-in counts, including more than one in a day.
                Influences can overlap, so their percentages may add up to more
                than 100%.
              </Text>
              <Text size="small" tone="muted">
                These are patterns, not conclusions about your health or what
                caused a feeling.
              </Text>
            </>
          )}
        </>
      )}
    </View>
  );
}
function formatDay(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
}
