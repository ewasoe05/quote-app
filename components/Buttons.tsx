import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text, useSurfaceColors } from '@/components/Themed';
import { formStyles } from '@/constants/Form';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Brand-filled primary CTA with a short press scale. */
export function PrimaryButton({ label, onPress, disabled, style }: Props) {
  const { tint } = useSurfaceColors();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      style={[
        formStyles.primaryButton,
        { backgroundColor: tint },
        disabled && formStyles.pressed,
        animatedStyle,
        style,
      ]}>
      <Text style={formStyles.primaryButtonText} lightColor="#fff" darkColor="#fff">
        {label}
      </Text>
    </AnimatedPressable>
  );
}

type SecondaryProps = Props & { children?: ReactNode };

export function SecondaryButton({
  label,
  onPress,
  disabled,
  style,
}: SecondaryProps) {
  const { tint, field, border } = useSurfaceColors();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      style={[
        formStyles.secondaryButton,
        { borderColor: border, backgroundColor: field },
        disabled && formStyles.pressed,
        animatedStyle,
        style,
      ]}>
      <Text style={[formStyles.secondaryButtonText, { color: tint }]}>{label}</Text>
    </AnimatedPressable>
  );
}

type FabProps = {
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
};

/** Circular FAB with press scale (Products). */
export function FabButton({ onPress, accessibilityLabel, children }: FabProps) {
  const { tint } = useSurfaceColors();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.94, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 140 });
      }}
      style={[styles.fab, { backgroundColor: tint }, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
