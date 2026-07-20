import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View } from '@/components/Themed';

type KeyboardFormProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'children'>;
  /** When false, only wraps children in KeyboardAvoidingView (no ScrollView). */
  scroll?: boolean;
};

/**
 * Shared keyboard-safe form shell for quote/product/settings screens.
 * iOS offset accounts for status bar + nav header so fields stay above the keyboard.
 */
export default function KeyboardForm({
  children,
  contentContainerStyle,
  style,
  scrollProps,
  scroll = true,
}: KeyboardFormProps) {
  const insets = useSafeAreaInsets();
  // Approx nav header (44) + status bar; avoids a hard dep on @react-navigation/elements.
  const keyboardVerticalOffset =
    Platform.OS === 'ios' ? insets.top + 44 : 0;

  const shell = (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.content, contentContainerStyle]}
          {...scrollProps}>
          <View style={styles.inner} lightColor="transparent" darkColor="transparent">
            {children}
          </View>
        </ScrollView>
      ) : (
        children
      )}
    </KeyboardAvoidingView>
  );

  return shell;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
  },
  inner: {
    gap: 6,
  },
});
