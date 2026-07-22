import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';

import { Text, View, useThemeColor } from '@/components/Themed';
import LiteratureShareSheet from '@/components/LiteratureShareSheet';
import { formStyles } from '@/constants/Form';
import { calcQuoteTotals } from '@/lib/calc';
import { getBusinessSettings } from '@/lib/db';
import { captureException } from '@/lib/monitoring';
import { createQuotePdfFile, shareQuotePdf } from '@/lib/pdf';
import { formatCurrency } from '@/lib/products';
import {
  buildQuoteShareMessage,
  calcDepositAmount,
  normalizeValidUntil,
} from '@/lib/quoteDocument';
import {
  listQuoteLiterature,
  type QuoteLiteratureOption,
} from '@/lib/quoteLiterature';
import { formatQuoteDate, formatQuoteNumber } from '@/lib/quotes';
import { useQuoteStore } from '@/store/quoteStore';

/**
 * In-app quote document preview (RN facsimile) + share.
 * OTA-friendly: no WebView — system print UI opens the real PDF.
 */
export default function QuotePreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const quoteId = typeof id === 'string' ? id : '';

  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const background = useThemeColor({}, 'background');
  const fieldBg = useThemeColor(
    { light: '#f2f3f5', dark: 'rgba(255,255,255,0.08)' },
    'background'
  );
  const borderColor = useThemeColor(
    { light: '#dde1e6', dark: 'rgba(255,255,255,0.12)' },
    'text'
  );

  const quote = useQuoteStore((s) => s.quote);
  const items = useQuoteStore((s) => s.items);
  const loading = useQuoteStore((s) => s.loading);
  const flush = useQuoteStore((s) => s.flush);
  const loadQuote = useQuoteStore((s) => s.loadQuote);
  const updateQuoteFields = useQuoteStore((s) => s.updateQuoteFields);

  const [busy, setBusy] = useState<'share' | 'open' | null>(null);
  const [literatureSheetOpen, setLiteratureSheetOpen] = useState(false);
  const [literatureOptions, setLiteratureOptions] = useState<
    QuoteLiteratureOption[]
  >([]);
  const [literatureLoading, setLiteratureLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!quoteId) return;
      void loadQuote(quoteId);
    }, [loadQuote, quoteId])
  );

  const totals = useMemo(() => {
    if (!quote) {
      return calcQuoteTotals({
        items: [],
        discount: 0,
        discountType: 'flat',
        taxRate: 0,
      });
    }
    return calcQuoteTotals({
      items,
      discount: quote.discount,
      discountType: quote.discountType ?? 'flat',
      taxRate: quote.taxRate,
    });
  }, [items, quote]);

  const depositDue = quote
    ? calcDepositAmount(
        totals.grandTotal,
        quote.deposit ?? 0,
        quote.depositType ?? 'percent'
      )
    : 0;

  const shareMessage = useMemo(() => {
    if (!quote) return '';
    return buildQuoteShareMessage({ quote, items });
  }, [items, quote]);

  const finishShare = useCallback(
    async (literature: QuoteLiteratureOption[]) => {
      if (!quote) return;
      setBusy('share');
      try {
        await flush();
        const business = await getBusinessSettings();
        const latest = useQuoteStore.getState();
        await shareQuotePdf(
          {
            quote: latest.quote ?? quote,
            items: latest.items,
            business,
          },
          { literature }
        );
        setLiteratureSheetOpen(false);
        if (quote.status !== 'sent') {
          Alert.alert(
            'Mark as sent?',
            'Did you send this quote to the customer?',
            [
              { text: 'Not yet', style: 'cancel' },
              {
                text: 'Mark as sent',
                onPress: () => {
                  updateQuoteFields({ status: 'sent' });
                  void flush();
                },
              },
            ]
          );
        }
      } catch (err) {
        captureException(err, { action: 'preview-share-pdf', quoteId });
        Alert.alert(
          'Could not share PDF',
          err instanceof Error ? err.message : 'Something went wrong.'
        );
      } finally {
        setBusy(null);
      }
    },
    [flush, quote, quoteId, updateQuoteFields]
  );

  const runShare = useCallback(async () => {
    if (!quote || busy) return;
    setBusy('share');
    setLiteratureLoading(true);
    try {
      await flush();
      const latestItems = useQuoteStore.getState().items;
      const options = await listQuoteLiterature(latestItems);
      if (options.length === 0) {
        await finishShare([]);
        return;
      }
      setLiteratureOptions(options);
      setLiteratureSheetOpen(true);
      setBusy(null);
    } catch (err) {
      captureException(err, { action: 'preview-list-literature', quoteId });
      await finishShare([]);
    } finally {
      setLiteratureLoading(false);
    }
  }, [busy, finishShare, flush, quote, quoteId]);

  const openSystemPreview = useCallback(async () => {
    if (!quote || busy) return;
    setBusy('open');
    try {
      await flush();
      const business = await getBusinessSettings();
      const latest = useQuoteStore.getState();
      const { uri } = await createQuotePdfFile({
        quote: latest.quote ?? quote,
        items: latest.items,
        business,
      });
      await Print.printAsync({ uri });
    } catch (err) {
      captureException(err, { action: 'preview-open-pdf', quoteId });
      Alert.alert(
        'Could not open PDF',
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    } finally {
      setBusy(null);
    }
  }, [busy, flush, quote, quoteId]);

  if (loading || !quote || quote.id !== quoteId) {
    return (
      <View style={[styles.centered, { backgroundColor: background }]}>
        <Stack.Screen options={{ title: 'Preview' }} />
        {loading || !quoteId ? (
          <ActivityIndicator size="large" color={tint} />
        ) : (
          <>
            <Text style={{ opacity: 0.65, textAlign: 'center', padding: 24 }}>
              Could not load this quote.
            </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={{ color: tint, fontWeight: '600' }}>Go back</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const valid = normalizeValidUntil(quote.validUntil);

  return (
    <View style={[styles.screen, { backgroundColor: background }]}>
      <Stack.Screen
        options={{
          title: 'Preview',
          headerBackTitle: 'Quote',
        }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 160 + insets.bottom },
        ]}>
        <Text style={styles.docTitle}>
          Quote {formatQuoteNumber(quote.quoteNumber) || ''}
        </Text>
        <Text style={styles.meta}>
          {formatQuoteDate(quote.createdAt)}
          {valid ? ` · Valid until ${valid}` : ''}
        </Text>

        <View style={[styles.card, { backgroundColor: fieldBg, borderColor }]}>
          <Text style={styles.cardLabel}>Bill to</Text>
          <Text style={[styles.cardBody, { color: textColor }]}>
            {quote.customerName.trim() || '—'}
          </Text>
          {quote.phone.trim() ? (
            <Text style={styles.cardMuted}>{quote.phone.trim()}</Text>
          ) : null}
          {quote.email.trim() ? (
            <Text style={styles.cardMuted}>{quote.email.trim()}</Text>
          ) : null}
          {quote.address.trim() ? (
            <>
              <Text style={[styles.cardLabel, styles.cardLabelSpaced]}>Ship to</Text>
              <Text style={[styles.cardBody, { color: textColor }]}>
                {quote.address.trim()}
              </Text>
            </>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: fieldBg, borderColor }]}>
          <Text style={styles.cardLabel}>Line items</Text>
          {items.length === 0 ? (
            <Text style={styles.cardMuted}>No line items</Text>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={[styles.itemName, { color: textColor }]}>
                  {item.quantity} × {item.nameSnapshot}
                </Text>
                <Text style={{ color: textColor }}>
                  {formatCurrency(item.priceSnapshot * item.quantity)}
                </Text>
              </View>
            ))
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={[styles.totalValue, { color: tint }]}>
              {formatCurrency(totals.grandTotal)}
            </Text>
          </View>
          {depositDue > 0 ? (
            <Text style={styles.cardMuted}>
              Deposit to schedule: {formatCurrency(depositDue)}
            </Text>
          ) : null}
          {quote.paymentTerms.trim() ? (
            <Text style={styles.cardMuted}>
              Terms: {quote.paymentTerms.trim()}
            </Text>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: fieldBg, borderColor }]}>
          <Text style={styles.cardLabel}>Share message</Text>
          <Text style={[styles.cardBody, { color: textColor }]}>{shareMessage}</Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: background,
            borderColor,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}>
        <Pressable
          disabled={!!busy}
          onPress={() => {
            void openSystemPreview();
          }}
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor, backgroundColor: fieldBg },
            (pressed || busy) && formStyles.pressed,
          ]}>
          <Text style={[styles.secondaryText, { color: tint }]}>
            {busy === 'open' ? 'Opening…' : 'Open PDF preview'}
          </Text>
        </Pressable>
        <Pressable
          disabled={!!busy}
          onPress={() => {
            void runShare();
          }}
          style={({ pressed }) => [
            formStyles.primaryButton,
            { backgroundColor: tint },
            (pressed || busy) && formStyles.pressed,
          ]}>
          <Text style={formStyles.primaryButtonText} lightColor="#fff" darkColor="#000">
            {busy === 'share' || literatureLoading ? 'Preparing…' : 'Share PDF'}
          </Text>
        </Pressable>
      </View>

      <LiteratureShareSheet
        visible={literatureSheetOpen}
        options={literatureOptions}
        loading={literatureLoading}
        confirming={busy === 'share'}
        onClose={() => {
          if (busy === 'share') return;
          setLiteratureSheetOpen(false);
        }}
        onConfirm={(selected) => {
          void finishShare(selected);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  docTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 4,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.04,
    textTransform: 'uppercase',
    opacity: 0.55,
    marginBottom: 2,
  },
  cardLabelSpaced: {
    marginTop: 10,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 21,
  },
  cardMuted: {
    fontSize: 13,
    opacity: 0.65,
    lineHeight: 18,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.12)',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  secondaryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
