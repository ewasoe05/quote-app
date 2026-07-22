import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { View, useSurfaceColors } from '@/components/Themed';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

/** Surface card shell for list rows (quotes / products). */
export default function ListCard({ children, style, padded = true }: Props) {
  const { surface, border } = useSurfaceColors();

  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        { backgroundColor: surface, borderColor: border },
        style,
      ]}
      lightColor={surface}
      darkColor={surface}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  padded: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
