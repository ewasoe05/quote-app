import { Pressable } from 'react-native';

import { Text, useSurfaceColors } from '@/components/Themed';
import { formStyles } from '@/constants/Form';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export default function FilterChip({ label, selected, onPress }: Props) {
  const { tint, field, border, text } = useSurfaceColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        formStyles.chip,
        {
          borderColor: selected ? tint : border,
          backgroundColor: selected ? tint : field,
        },
        pressed && formStyles.pressed,
      ]}>
      <Text
        style={formStyles.chipText}
        lightColor={selected ? '#fff' : text}
        darkColor={selected ? '#fff' : text}>
        {label}
      </Text>
    </Pressable>
  );
}
