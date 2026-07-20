import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import QuoteCard from '@/components/QuoteCard';
import { Text, View, useThemeColor } from '@/components/Themed';
import { createQuote, deleteQuote, getQuotesWithTotals } from '@/lib/db';
import type { QuoteListItem } from '@/lib/quotes';

export default function QuotesScreen() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');

  const loadQuotes = useCallback(async () => {
    try {
      const rows = await getQuotesWithTotals();
      setQuotes(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadQuotes();
    }, [loadQuotes])
  );

  const openQuote = useCallback(
    (quote: QuoteListItem) => {
      router.push({ pathname: '/quote/[id]', params: { id: quote.id } });
    },
    [router]
  );

  const handleNewQuote = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const quote = await createQuote({
        customerName: '',
        phone: '',
        email: '',
        address: '',
        status: 'draft',
        discount: 0,
        taxRate: 0,
        notes: '',
      });
      router.push({ pathname: '/quote/[id]', params: { id: quote.id } });
    } catch (err) {
      Alert.alert(
        'Could not create quote',
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    } finally {
      setCreating(false);
    }
  }, [creating, router]);

  const handleDelete = useCallback(async (quote: QuoteListItem) => {
    try {
      await deleteQuote(quote.id);
      setQuotes((current) => current.filter((item) => item.id !== quote.id));
    } catch (err) {
      Alert.alert(
        'Delete failed',
        err instanceof Error ? err.message : 'Could not delete quote.'
      );
    }
  }, []);

  const isEmpty = !loading && quotes.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <View style={styles.headerBar} lightColor="transparent" darkColor="transparent">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New quote"
          disabled={creating}
          style={({ pressed }) => [
            styles.newButton,
            { backgroundColor: tint },
            (pressed || creating) && styles.newButtonPressed,
          ]}
          onPress={() => {
            void handleNewQuote();
          }}>
          <Text style={styles.newButtonText} lightColor="#fff" darkColor="#000">
            {creating ? 'Creating…' : 'New Quote'}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tint} />
        </View>
      ) : isEmpty ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No quotes yet</Text>
          <Text style={styles.emptySubtitle}>
            Create a draft to start building a customer estimate.
          </Text>
        </View>
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <QuoteCard
              quote={item}
              onPress={openQuote}
              onDelete={(quote) => {
                void handleDelete(quote);
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'flex-end',
  },
  newButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  newButtonPressed: {
    opacity: 0.85,
  },
  newButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.65,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },
});
