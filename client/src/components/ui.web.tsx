import {useId, type ReactNode} from 'react';
import type {
  TextProps,
  TitleProps,
  ButtonProps,
  FieldProps,
  ChoiceProps,
  AnchorProps,
  IconName,
} from './ui.types';
export function Text({
  children,
  tone,
  size = 'body',
  weight,
  center,
}: TextProps) {
  return (
    <p
      className={`text text-${size} ${tone ? `text-${tone}` : ''} ${weight === 'bold' ? 'bold' : ''} ${center ? 'center' : ''}`}>
      {children}
    </p>
  );
}
export function Title({children, level = 1}: TitleProps) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3';
  return (
    <Tag
      className={`heading heading-${level}`}
      tabIndex={level === 1 ? -1 : undefined}>
      {children}
    </Tag>
  );
}
export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled,
  busy,
  label,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={type === 'submit' ? undefined : onPress}
      className={`button button-${variant}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      aria-label={label}>
      {children}
    </button>
  );
}
export function Field({
  label,
  value,
  onChange,
  multiline,
  hint,
  error,
  id,
}: FieldProps) {
  const descriptionId = useId();
  const props = {
    id,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    'aria-describedby': descriptionId,
    'aria-invalid': !!error,
    className: 'field',
    autoComplete: 'off',
  };
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea {...props} rows={6} />
      ) : (
        <input {...props} type="text" />
      )}
      <p
        id={descriptionId}
        className={`text text-small ${error ? 'text-danger' : 'text-muted'}`}>
        {error || hint}
      </p>
    </div>
  );
}
export function Choice({
  children,
  selected,
  label,
  onPress,
  kind = 'checkbox',
  compact,
}: ChoiceProps) {
  return (
    <button
      type="button"
      role={kind}
      aria-checked={selected}
      aria-label={label}
      onClick={onPress}
      className={`choice ${compact ? 'choice-compact' : ''} ${selected ? 'selected' : ''}`}>
      {children}
    </button>
  );
}
export function ChoiceGroup({
  children,
  label,
  radio,
}: {
  children: ReactNode;
  label: string;
  radio?: boolean;
}) {
  return (
    <div
      role={radio ? 'radiogroup' : 'group'}
      aria-label={label}
      className={radio ? 'radio-group' : 'influence-group'}
      onKeyDown={(e) => {
        if (
          !radio ||
          ![
            'ArrowLeft',
            'ArrowRight',
            'ArrowDown',
            'ArrowUp',
            'Home',
            'End',
          ].includes(e.key)
        )
          return;
        const buttons = Array.from(
          e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=radio]'),
        );
        const index = buttons.indexOf(e.target as HTMLButtonElement);
        if (index < 0) return;
        e.preventDefault();
        const step = ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1;
        const target =
          e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? buttons.length - 1
              : (index + step + buttons.length) % buttons.length;
        buttons[target]?.focus();
        buttons[target]?.click();
      }}>
      {children}
    </div>
  );
}
export function Anchor({href, children, external, label, target}: AnchorProps) {
  return (
    <a
      href={href}
      target={target ?? (external ? '_blank' : undefined)}
      rel={external ? 'noopener noreferrer' : undefined}
      aria-label={label}
      className="text-link">
      {children}
      {external && target !== '_top' && (
        <span className="sr-only"> (opens in a new tab)</span>
      )}
    </a>
  );
}
export function Form({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: () => void;
}) {
  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}>
      {children}
    </form>
  );
}
export function Status({
  children,
  error,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`status ${error ? 'status-error' : ''}`}
      role={error ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
const paths: Record<IconName, ReactNode> = {
  checkin: (
    <>
      <path d="M3 10 12 3l9 7v11h-6v-7H9v7H3Z" />
    </>
  ),
  moments: (
    <>
      <path d="M12 5v16M12 5C8 2 4 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-2-1-6-2-10 1Z" />
    </>
  ),
  patterns: (
    <>
      <path d="M5 20v-6m7 6V8m7 12V3" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 2-2.5 2-2.5 4M12 17h.01" />
    </>
  ),
  back: <path d="m15 5-7 7 7 7" />,
  next: <path d="m9 5 7 7-7 7" />,
  check: <path d="m5 12 4 4L19 6" />,
};
export function Icon({name, size = 24}: {name: IconName; size?: number}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
