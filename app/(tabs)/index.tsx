import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import QuoteCard from '@/components/QuoteCard';
import { Text, View, useThemeColor } from '@/components/Themed';
import {
  createQuote,
  deleteQuote,
  duplicateQuote,
  getBusinessSettings,
  getQuotesWithTotals,
} from '@/lib/db';
import { captureException } from '@/lib/monitoring';
import type { QuoteListItem } from '@/lib/quotes';
import {
  QUOTE_STATUSES,
  QUOTE_STATUS_LABELS,
  type QuoteStatus,
} from '@/lib/types';

type StatusFilter = 'all' | QuoteStatus;

const FILTERS: StatusFilter[] = ['all', ...QUOTE_STATUSES];

export default function QuotesScreen() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const fieldBg = useThemeColor(
    { light: '#f2f3f5', dark: 'rgba(255,255,255,0.08)' },
    'background'
  );
  const borderColor = useThemeColor(
    { light: '#dde1e6', dark: 'rgba(255,255,255,0.12)' },
    'text'
  );

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

  const filteredQuotes = useMemo(() => {
    if (statusFilter === 'all') return quotes;
    return quotes.filter((quote) => quote.status === statusFilter);
  }, [quotes, statusFilter]);

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
      const business = await getBusinessSettings();
      const quote = await createQuote({
        customerName: '',
        phone: '',
        email: '',
        address: '',
        status: 'draft',
        discount: 0,
        discountType: 'flat',
        taxRate: business.defaultTaxRate || 0,
        notes: '',
      });
      router.push({ pathname: '/quote/[id]', params: { id: quote.id } });
    } catch (err) {
      captureException(err, { action: 'create-quote' });
      Alert.alert(
        'Could not create quote',
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    } finally {
      setCreating(false);
    }
  }, [creating, router]);

  const handleDuplicate = useCallback(
    async (quote: QuoteListItem) => {
      try {
        const copy = await duplicateQuote(quote.id);
        await loadQuotes();
        router.push({ pathname: '/quote/[id]', params: { id: copy.id } });
      } catch (err) {
        captureException(err, { action: 'duplicate-quote', quoteId: quote.id });
        Alert.alert(
          'Duplicate failed',
          err instanceof Error ? err.message : 'Could not duplicate quote.'
        );
      }
    },
    [loadQuotes, router]
  );

  const handleDelete = useCallback(async (quote: QuoteListItem) => {
    try {
      await deleteQuote(quote.id);
      setQuotes((current) => current.filter((item) => item.id !== quote.id));
    } catch (err) {
      captureException(err, { action: 'delete-quote', quoteId: quote.id });
      Alert.alert(
        'Delete failed',
        err instanceof Error ? err.message : 'Could not delete quote.'
      );
    }
  }, []);

  const isEmpty = !loading && quotes.length === 0;
  const filterEmpty = !loading && !isEmpty && filteredQuotes.length === 0;

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

      {!isEmpty ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}>
          {FILTERS.map((filter) => {
            const selected = statusFilter === filter;
            const label =
              filter === 'all' ? 'All' : QUOTE_STATUS_LABELS[filter];
            return (
              <Pressable
                key={filter}
                onPress={() => setStatusFilter(filter)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: selected ? tint : borderColor,
                    backgroundColor: selected ? tint : fieldBg,
                  },
                ]}>
                <Text
                  style={styles.filterChipText}
                  lightColor={selected ? '#fff' : '#111'}
                  darkColor={selected ? '#000' : '#fff'}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

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
      ) : filterEmpty ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No matching quotes</Text>
          <Text style={styles.emptySubtitle}>
            Try another status filter, or create a new quote.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredQuotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <QuoteCard
              quote={item}
              onPress={openQuote}
              onDuplicate={(quote) => {
                void handleDuplicate(quote);
              }}
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
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  newButtonPressed: {
    opacity: 0.85,
  },
  newButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  filters: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
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
