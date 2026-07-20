import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Text, View, useThemeColor } from '@/components/Themed';
import { getQuoteById } from '@/lib/db';
import type { Quote } from '@/lib/types';

/**
 * Quote builder placeholder — full editor lands in a later step.
 * Creating a draft from the Quotes tab navigates here so the list
 * already shows the new quote when the user returns.
 */
export default function QuoteBuilderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const quoteId = typeof id === 'string' ? id : '';
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!quoteId) {
          router.back();
          return;
        }
        const row = await getQuoteById(quoteId);
        if (cancelled) return;
        if (!row) {
          router.back();
          return;
        }
        setQuote(row);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId, router]);

  const title = quote?.customerName.trim() || 'New Quote';

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <Stack.Screen options={{ title, headerBackTitle: 'Quotes' }} />
      {loading ? (
        <ActivityIndicator size="large" color={tint} />
      ) : (
        <>
          <Text style={styles.title}>Quote builder</Text>
          <Text style={styles.subtitle}>
            Customer details, line items, and PDF export come next. This draft
            is already saved — it will show on the Quotes tab when you go back.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.65,
  },
});
