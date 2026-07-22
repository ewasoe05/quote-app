/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */
import { Text as DefaultText, View as DefaultView } from 'react-native';

import { useColorScheme } from './useColorScheme';

import Colors from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme();
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

/** Convenience hooks for the most-duplicated surface tokens. */
export function useSurfaceColors() {
  return {
    tint: useThemeColor({}, 'tint'),
    navy: useThemeColor({}, 'navy'),
    text: useThemeColor({}, 'text'),
    background: useThemeColor({}, 'background'),
    surface: useThemeColor({}, 'surface'),
    field: useThemeColor({}, 'field'),
    border: useThemeColor({}, 'border'),
    muted: useThemeColor({}, 'muted'),
    danger: useThemeColor({}, 'danger'),
    success: useThemeColor({}, 'success'),
  };
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <DefaultText
      style={[{ color, fontFamily: fonts.regular }, style]}
      {...otherProps}
    />
  );
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    'background'
  );

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
