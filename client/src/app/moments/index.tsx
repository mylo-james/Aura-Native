import {View} from 'react-native';
import {Link} from 'expo-router';
import {useInfiniteQuery} from '@tanstack/react-query';
import {useDemo} from '../../features/DemoProvider';
import {
  dateLabel,
  influences,
  moodName,
  momentTitle,
  type MomentPage,
} from '../../lib/contracts';
import {messageFor} from '../../lib/http';
import {Button, Text, Title, Status, Icon} from '../../components/ui';
import {Entry} from '../../components/Entry';
import {Moon} from '../../components/Moon';
import {s} from '../../theme/tokens';
export default function Moments() {
  const {demo, generation, read} = useDemo();
  const query = useInfiniteQuery({
    queryKey: ['moments', generation],
    initialPageParam: null as string | null,
    queryFn: ({pageParam, signal}) =>
      read<MomentPage>(
        `/api/moments?limit=20${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
        signal,
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: !!demo?.active,
  });
  if (!demo?.active) return <Entry />;
  const timezone = demo.timezone ?? 'UTC';
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <View style={s.page}>
      <View style={s.tight}>
        <Title>Your moments</Title>
        <Text tone="muted">A little space for what mattered.</Text>
      </View>
      {query.isPending && (
        <Status>
          <Text>Finding your moments…</Text>
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
      {!query.isPending && !query.isError && items.length === 0 && (
        <View style={s.stack}>
          <Text>There’s room for your first moment.</Text>
          <Link href="/check-in">
            <Text>Make a check-in</Text>
          </Link>
        </View>
      )}
      <View>
        {items.map((moment, index) => {
          const label = dateLabel(moment.createdAt, timezone, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          });
          const previous = items[index - 1];
          const newDate =
            !previous ||
            label !==
              dateLabel(previous.createdAt, timezone, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              });
          return (
            <View key={moment.id}>
              {newDate && (
                <View style={{paddingTop: index === 0 ? 0 : 24}}>
                  <Text size="small" weight="bold" tone="muted">
                    {label}
                  </Text>
                </View>
              )}
              <Link href={`/moments/${moment.id}`} className="moment-link">
                <View style={s.entry}>
                  <View style={s.row}>
                    <Moon mood={moment.mood} size={58} />
                    <View style={[s.flex, s.tight]}>
                      <Title level={2}>{momentTitle(moment, timezone)}</Title>
                      <Text size="small" tone="muted">
                        {dateLabel(moment.createdAt, timezone, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}{' '}
                        · {moodName(moment.mood)}
                      </Text>
                    </View>
                    <Icon name="next" size={18} />
                  </View>
                  {moment.body && (
                    <Text tone="muted">
                      {Array.from(moment.body).slice(0, 130).join('')}
                      {Array.from(moment.body).length > 130 ? '…' : ''}
                    </Text>
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
                </View>
              </Link>
            </View>
          );
        })}
      </View>
      {query.hasNextPage && (
        <Button
          variant="secondary"
          busy={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Loading moments…' : 'Load more moments'}
        </Button>
      )}
      <Text size="small" tone="muted">
        Your demo began with fictional moments. Anything you add stays in this
        temporary session.
      </Text>
    </View>
  );
}
