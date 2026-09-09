export type Mood = 1 | 2 | 3 | 4 | 5;
export const moods = [
  {value: 1, name: 'Low'},
  {value: 2, name: 'Tender'},
  {value: 3, name: 'Okay'},
  {value: 4, name: 'Good'},
  {value: 5, name: 'Bright'},
] as const;
export const influences = [
  'Work',
  'School',
  'Hobbies',
  'Family',
  'Love',
  'Friends',
  'Sleep',
  'Health',
  'Exercise',
];
export interface Demo {
  active: boolean;
  expiresAt: string | null;
  timezone: string | null;
  fixtureVersion: string;
  csrfToken: string;
  generation: string | null;
}
export interface Moment {
  id: string;
  mood: Mood;
  influences: number[];
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}
export interface MomentInput {
  mood: Mood;
  influences: number[];
  title: string;
  body: string;
  operationId: string;
}
export interface MomentPage {
  items: Moment[];
  nextCursor: string | null;
}
export interface Patterns {
  days: number;
  timezone: string;
  startDate: string;
  endDate: string;
  count: number;
  denominator: number;
  moods: {mood: Mood; count: number; percent: number}[];
  influences: {id: number; name: string; count: number; percent: number}[];
  state: 'empty' | 'insufficient' | 'ready';
}
export const moodName = (mood: number) =>
  moods.find((m) => m.value === mood)?.name ?? 'Moment';
export const codePoints = (value: string) => Array.from(value).length;
export const dateLabel = (
  value: string,
  timezone = 'UTC',
  options: Intl.DateTimeFormatOptions = {month: 'short', day: 'numeric'},
) =>
  new Intl.DateTimeFormat('en-US', {...options, timeZone: timezone}).format(
    new Date(value),
  );
export const momentTitle = (moment: Moment, timezone: string) =>
  moment.title.trim() ||
  `${moodName(moment.mood)} · ${dateLabel(moment.createdAt, timezone)}`;
