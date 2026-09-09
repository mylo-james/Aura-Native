import {
  Text as NativeText,
  View,
  Pressable,
  TextInput,
  Linking,
} from 'react-native';
import {color} from '../theme/tokens';
import type {ReactNode} from 'react';
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
    <NativeText
      style={{
        color: tone ? color[tone] : color.ink,
        fontSize: size === 'small' ? 13 : size === 'large' ? 20 : 16,
        lineHeight: size === 'small' ? 20 : 25,
        fontWeight: weight === 'bold' ? '600' : '400',
        textAlign: center ? 'center' : 'left',
      }}
    >
      {children}
    </NativeText>
  );
}
export function Title({children, level = 1}: TitleProps) {
  return (
    <NativeText
      accessibilityRole="header"
      style={{
        color: color.ink,
        fontSize: level === 1 ? 30 : 20,
        lineHeight: level === 1 ? 36 : 27,
        fontWeight: '700',
      }}
    >
      {children}
    </NativeText>
  );
}
export function Button({
  children,
  onPress,
  disabled,
  busy,
  variant = 'primary',
  label,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled: disabled || busy, busy}}
      disabled={disabled || busy}
      onPress={onPress}
      style={{
        minHeight: 48,
        padding: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: variant === 'primary' ? color.indigo : color.wash,
        opacity: disabled || busy ? 0.6 : 1,
      }}
    >
      <NativeText
        style={{
          color:
            variant === 'primary'
              ? color.white
              : variant === 'danger'
                ? color.danger
                : color.indigo,
          fontWeight: '600',
          fontSize: 16,
        }}
      >
        {children}
      </NativeText>
    </Pressable>
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
  return (
    <View style={{gap: 8}}>
      <Text weight="bold">{label}</Text>
      <TextInput
        nativeID={id}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        style={{
          minHeight: multiline ? 160 : 48,
          padding: 14,
          borderWidth: 1,
          borderColor: error ? color.danger : color.line,
          borderRadius: 12,
          color: color.ink,
          fontSize: 16,
          backgroundColor: color.white,
          textAlignVertical: 'top',
        }}
      />
      <Text size="small" tone={error ? 'danger' : 'muted'}>
        {error || hint}
      </Text>
    </View>
  );
}
export function Choice({
  children,
  selected,
  label,
  onPress,
  kind = 'checkbox',
}: ChoiceProps) {
  return (
    <Pressable
      accessibilityRole={kind}
      accessibilityLabel={label}
      accessibilityState={{checked: selected}}
      onPress={onPress}
      style={{
        minHeight: 48,
        minWidth: 44,
        flex: kind === 'radio' ? 1 : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderRadius: 12,
        backgroundColor: selected ? color.wash : 'transparent',
        borderWidth: 1,
        borderColor: selected ? color.indigo : color.line,
      }}
    >
      {children}
    </Pressable>
  );
}
export function ChoiceGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
  radio?: boolean;
}) {
  return (
    <View
      accessibilityLabel={label}
      style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}
    >
      {children}
    </View>
  );
}
export function Anchor({href, children, label}: AnchorProps) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => void Linking.openURL(href)}
      style={{minHeight: 44, justifyContent: 'center'}}
    >
      <Text>{children}</Text>
    </Pressable>
  );
}
export function Form({children}: {children: ReactNode; onSubmit: () => void}) {
  return <View style={{gap: 24}}>{children}</View>;
}
export function Status({
  children,
  error,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <View
      accessibilityRole={error ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      style={{
        padding: 16,
        gap: 8,
        borderRadius: 12,
        backgroundColor: color.wash,
      }}
    >
      {children}
    </View>
  );
}
export function Icon({name}: {name: IconName; size?: number}) {
  return (
    <NativeText accessibilityElementsHidden>
      {name === 'back' ? 'Back' : name === 'help' ? '?' : ''}
    </NativeText>
  );
}
