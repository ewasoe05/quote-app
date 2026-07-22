import { Text } from '@/components/Themed';
import { formStyles } from '@/constants/Form';

export default function FieldLabel({ children }: { children: string }) {
  return <Text style={formStyles.label}>{children}</Text>;
}
