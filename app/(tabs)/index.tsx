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

import { PrimaryButton } from '@/components/Buttons';
import EmptyState from '@/components/EmptyState';
import FilterChip from '@/components/FilterChip';
import QuoteCard from '@/components/QuoteCard';
import { Text, View, useSurfaceColors } from '@/components/Themed';
import { fonts } from '@/constants/Typography';
import {
  createQuote,
  createQuoteFromTemplate,
  deleteQuote,
  duplicateQuote,
  getBusinessSettings,
  getQuotesWithTotals,
} from '@/lib/db';
import { captureException } from '@/lib/monitoring';
import { validUntilFromDays } from '@/lib/quoteDocument';
import {
  filterQuoteList,
  getQuoteListFilterLabel,
  QUOTE_LIST_FILTERS,
  type QuoteListFilter,
  type QuoteListItem,
} from '@/lib/quotes';

export default function QuotesScreen() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [listFilter, setListFilter] = useState<QuoteListFilter>('all');
  const { tint, background, field, border, navy } = useSurfaceColors();

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

  const filteredQuotes = useMemo(
    () => filterQuoteList(quotes, listFilter),
    [listFilter, quotes]
  );

  const dueTodayCount = useMemo(
    () => filterQuoteList(quotes, 'due_today').length,
    [quotes]
  );

  const openQuote = useCallback(
    (quote: QuoteListItem) => {
      router.push({ pathname: '/quote/[id]', params: { id: quote.id } });
    },
    [router]
  );

  const blankQuoteFields = useCallback(async () => {
    const business = await getBusinessSettings();
    return {
      customerName: '',
      phone: '',
      email: '',
      address: '',
      status: 'draft' as const,
      discount: 0,
      discountType: 'flat' as const,
      taxRate: business.defaultTaxRate || 0,
      notes: '',
      validUntil: validUntilFromDays(business.defaultValidDays),
      deposit: business.defaultDeposit || 0,
      depositType: business.defaultDepositType || 'percent',
      paymentTerms: business.defaultPaymentTerms || '',
      statusReason: '',
      customerSignatureUri: null,
      techSignatureUri: null,
      signedAt: null,
      jobSitePhotoUri: null,
      followUpDate: null,
      isTemplate: false,
    };
  }, []);

  const handleNewQuote = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const quote = await createQuote(await blankQuoteFields());
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
  }, [blankQuoteFields, creating, router]);

  const handleDuplicate = useCallback(
    async (quote: QuoteListItem, clearCustomer = false) => {
      try {
        const copy = await duplicateQuote(quote.id, { clearCustomer });
        await loadQuotes();
        router.push({ pathname: '/quote/[id]', params: { id: copy.id } });
      } catch (err) {
        captureException(err, {
          action: clearCustomer ? 'duplicate-new-customer' : 'duplicate-quote',
          quoteId: quote.id,
        });
        Alert.alert(
          'Duplicate failed',
          err instanceof Error ? err.message : 'Could not duplicate quote.'
        );
      }
    },
    [loadQuotes, router]
  );

  const handleUseTemplate = useCallback(
    async (quote: QuoteListItem) => {
      try {
        const created = await createQuoteFromTemplate(quote.id);
        await loadQuotes();
        router.push({ pathname: '/quote/[id]', params: { id: created.id } });
      } catch (err) {
        captureException(err, { action: 'use-template', quoteId: quote.id });
        Alert.alert(
          'Could not use template',
          err instanceof Error ? err.message : 'Something went wrong.'
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

  const isEmpty = !loading && quotes.filter((q) => !q.isTemplate).length === 0;
  const filterEmpty = !loading && filteredQuotes.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <View style={styles.headerBar} lightColor="transparent" darkColor="transparent">
        {dueTodayCount > 0 ? (
          <Pressable
            onPress={() => setListFilter('due_today')}
            style={[
              styles.dueBadge,
              { backgroundColor: field, borderColor: border },
            ]}>
            <Text style={[styles.dueBadgeText, { color: tint }]}>
              {dueTodayCount} due today
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.headerHint, { color: navy }]}>Pipeline</Text>
        )}
        <PrimaryButton
          label={creating ? 'Creating…' : 'New Quote'}
          onPress={() => {
            void handleNewQuote();
          }}
          disabled={creating}
          style={styles.newButton}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}>
        {QUOTE_LIST_FILTERS.map((filter) => (
          <FilterChip
            key={filter}
            label={getQuoteListFilterLabel(filter)}
            selected={listFilter === filter}
            onPress={() => setListFilter(filter)}
          />
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tint} />
        </View>
      ) : isEmpty && listFilter === 'all' ? (
        <EmptyState
          title="No quotes yet"
          body="Create a draft to start building a customer estimate on the truck."
          actionLabel={creating ? 'Creating…' : 'New Quote'}
          actionDisabled={creating}
          onAction={() => {
            void handleNewQuote();
          }}
        />
      ) : filterEmpty ? (
        <EmptyState
          title="No matching quotes"
          body="Try another filter, open Templates, or create a new quote."
        />
      ) : (
        <FlatList
          data={filteredQuotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <QuoteCard
              quote={item}
              onPress={openQuote}
              onDuplicate={(quote) => {
                void handleDuplicate(quote, false);
              }}
              onDuplicateNewCustomer={(quote) => {
                void handleDuplicate(quote, true);
              }}
              onUseTemplate={(quote) => {
                void handleUseTemplate(quote);
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerHint: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  dueBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 36,
    justifyContent: 'center',
  },
  dueBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  newButton: {
    marginTop: 0,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filters: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },
});
