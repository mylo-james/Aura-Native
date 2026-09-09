import type {ReactNode} from 'react';
export interface TextProps {
  children: ReactNode;
  tone?: 'muted' | 'danger' | 'success';
  size?: 'small' | 'body' | 'large';
  weight?: 'normal' | 'bold';
  center?: boolean;
}
export interface TitleProps {
  children: ReactNode;
  level?: 1 | 2 | 3;
}
export interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  label?: string;
  type?: 'button' | 'submit';
}
export interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  hint?: string;
  error?: string;
  id: string;
}
export interface ChoiceProps {
  children: ReactNode;
  label: string;
  selected: boolean;
  onPress: () => void;
  kind?: 'radio' | 'checkbox';
  compact?: boolean;
}
export interface AnchorProps {
  href: string;
  children: ReactNode;
  external?: boolean;
  target?: '_blank' | '_top';
  label?: string;
}
export type IconName =
  'checkin' | 'moments' | 'patterns' | 'help' | 'back' | 'next' | 'check';
