import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { initializeDatabase, seedDefaultCatalog } from '@/lib/db';
import { captureException, initMonitoring, wrapRoot } from '@/lib/monitoring';
import { sweepPdfCache } from '@/lib/pdf';

// Before anything else, so startup crashes are captured too.
initMonitoring();

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [loaded, error] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<Error | null>(null);

  useEffect(() => {
    if (error) {
      captureException(error, { stage: 'font-load' });
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (dbError) {
      captureException(dbError, { stage: 'db-init' });
      throw dbError;
    }
  }, [dbError]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await initializeDatabase();
        await seedDefaultCatalog();
        // Clear PDFs left in the cache by previous sessions.
        sweepPdfCache();
        if (!cancelled) setDbReady(true);
      } catch (err) {
        if (!cancelled) {
          setDbError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loaded && dbReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, dbReady]);

  if (!loaded || !dbReady) {
    return null;
  }

  return <RootLayoutNav />;
}

export default wrapRoot(RootLayout);

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const navTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const palette = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider
        value={{
          ...navTheme,
          colors: {
            ...navTheme.colors,
            primary: palette.tint,
            background: palette.background,
            card: palette.surface,
            text: palette.text,
            border: palette.border,
          },
          fonts: {
            ...navTheme.fonts,
            regular: {
              ...navTheme.fonts.regular,
              fontFamily: fonts.regular,
            },
            medium: {
              ...navTheme.fonts.medium,
              fontFamily: fonts.medium,
            },
            bold: {
              ...navTheme.fonts.bold,
              fontFamily: fonts.bold,
            },
            heavy: {
              ...navTheme.fonts.heavy,
              fontFamily: fonts.bold,
            },
          },
        }}>
        <Stack
          screenOptions={{
            headerTitleStyle: { fontFamily: fonts.semibold },
            headerBackTitleStyle: { fontFamily: fonts.regular },
            contentStyle: { backgroundColor: palette.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="quote/[id]"
            options={{
              title: 'Quote',
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="quote/preview/[id]"
            options={{
              title: 'Preview',
              presentation: 'card',
            }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
