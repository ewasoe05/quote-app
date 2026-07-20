import { Stack } from 'expo-router';

export default function ProductsLayout() {
  return (
    <Stack>
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
