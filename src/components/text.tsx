import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

/** Font files to load at startup (see app/_layout.tsx). */
export const APP_FONTS = {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
};

const FAMILY: Record<string, keyof typeof APP_FONTS> = {
  '100': 'Outfit_400Regular',
  '200': 'Outfit_400Regular',
  '300': 'Outfit_400Regular',
  '400': 'Outfit_400Regular',
  normal: 'Outfit_400Regular',
  '500': 'Outfit_500Medium',
  '600': 'Outfit_600SemiBold',
  '700': 'Outfit_700Bold',
  bold: 'Outfit_700Bold',
  '800': 'Outfit_800ExtraBold',
  '900': 'Outfit_800ExtraBold',
};

/**
 * Android can't pick a weight from one custom font family, so each weight is its own
 * font file. These swap `fontWeight` in a style for the matching Outfit file.
 */
export function fontFor(weight: TextStyle['fontWeight']): TextStyle {
  return { fontFamily: FAMILY[String(weight ?? '400')] ?? FAMILY['400'], fontWeight: 'normal' };
}

export function Text({ style, ...props }: TextProps) {
  const weight = StyleSheet.flatten(style)?.fontWeight;
  return <RNText {...props} style={[style, fontFor(weight)]} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  const weight = StyleSheet.flatten(style)?.fontWeight;
  return <RNTextInput {...props} style={[style, fontFor(weight)]} />;
}
