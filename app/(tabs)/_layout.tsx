import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import Colors from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.tint,
        tabBarInactiveTintColor: palette.tabIconDefault,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.semibold,
          fontSize: 11,
        },
        headerStyle: {
          backgroundColor: palette.surface,
        },
        headerTitleStyle: {
          fontFamily: fonts.semibold,
          color: palette.navy,
        },
        headerShadowVisible: false,
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Quotes',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'doc.text',
                android: 'description',
                web: 'description',
              }}
              tintColor={color}
              size={Platform.OS === 'ios' ? 26 : 24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'shippingbox',
                android: 'inventory_2',
                web: 'inventory_2',
              }}
              tintColor={color}
              size={Platform.OS === 'ios' ? 26 : 24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'gearshape',
                android: 'settings',
                web: 'settings',
              }}
              tintColor={color}
              size={Platform.OS === 'ios' ? 26 : 24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
