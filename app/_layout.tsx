import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { initializeDatabase, seedDefaultCatalog } from '@/lib/db';
import { captureException, initMonitoring } from '@/lib/monitoring';
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

export default function RootLayout() {
  const [loaded, error] = useFonts({
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

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="quote/[id]"
            options={{
              title: 'Quote',
              presentation: 'card',
            }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
