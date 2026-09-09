import {View} from 'react-native';
import {moods, influences, codePoints, type Mood} from '../lib/contracts';
import {s} from '../theme/tokens';
import {Choice, ChoiceGroup, Field, Text, Title} from './ui';
import {Moon} from './Moon';
import {AnimatedMoon} from './AnimatedMoon';
import {validateReflection} from '../features/draft';
export function MoodFields({
  mood,
  selectedInfluences,
  onMood,
  onInfluence,
}: {
  mood: Mood | null;
  selectedInfluences: number[];
  onMood: (value: Mood) => void;
  onInfluence: (value: number) => void;
}) {
  return (
    <View style={s.stack}>
      <View style={s.center}>
        <View style={s.moonStage}>
          <AnimatedMoon mood={mood ?? 6} />
        </View>
      </View>
      <ChoiceGroup label="How are you feeling?" radio>
        {moods.map((option) => (
          <Choice
            key={option.value}
            kind="radio"
            compact
            label={option.name}
            selected={mood === option.value}
            onPress={() => onMood(option.value)}
          >
            <Moon mood={option.value} size={42} />
            <Text size="small">{option.name}</Text>
          </Choice>
        ))}
      </ChoiceGroup>
      <View style={[s.tight, {marginTop: 12}]}>
        <Title level={2}>What’s been part of your day?</Title>
        <Text tone="muted" size="small">
          Choose any, or skip.
        </Text>
      </View>
      <ChoiceGroup label="Influences (optional)">
        {influences.map((name, index) => (
          <Choice
            key={name}
            label={name}
            selected={selectedInfluences.includes(index + 1)}
            onPress={() => onInfluence(index + 1)}
          >
            <Text size="small">{name}</Text>
          </Choice>
        ))}
      </ChoiceGroup>
    </View>
  );
}
export function ReflectionFields({
  title,
  body,
  onTitle,
  onBody,
  errors,
}: {
  title: string;
  body: string;
  onTitle: (value: string) => void;
  onBody: (value: string) => void;
  errors?: Record<string, string>;
}) {
  const validation = validateReflection(title, body);
  return (
    <View style={s.stack}>
      <Field
        id="moment-title"
        label="A title (optional)"
        value={title}
        onChange={onTitle}
        hint={`${codePoints(title)} / 50 characters`}
        error={validation.title || errors?.title}
      />
      <Field
        id="moment-body"
        label="Your reflection (optional)"
        value={body}
        onChange={onBody}
        multiline
        hint={`${codePoints(body)} / 2,000 characters. A few words, or none at all.`}
        error={validation.body || errors?.body}
      />
    </View>
  );
}
