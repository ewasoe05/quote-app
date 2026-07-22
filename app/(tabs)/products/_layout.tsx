import { Stack } from 'expo-router';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

export default function ProductsLayout() {
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTitleStyle: {
          fontFamily: fonts.semibold,
          color: palette.navy,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: palette.background },
      }}>
      <Stack.Screen name="index" options={{ title: 'Products' }} />
      <Stack.Screen
        name="edit"
        options={{
          presentation: 'modal',
          title: 'Product',
          headerBackTitle: 'Cancel',
        }}
      />
    </Stack>
  );
}
