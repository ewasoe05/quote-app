import { TextStyle } from 'react-native';

/** Outfit faces registered in app/_layout via useFonts. */
export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  /** Spare mono for quote # refs only. */
  mono: 'SpaceMono',
} as const;

export const typography = {
  display: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
  } satisfies TextStyle,
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  } satisfies TextStyle,
  section: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
  } satisfies TextStyle,
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
  } satisfies TextStyle,
  bodyStrong: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
  } satisfies TextStyle,
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  caption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  } satisfies TextStyle,
  monoRef: {
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: 18,
  } satisfies TextStyle,
} as const;
