import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import LineItemRow from '@/components/LineItemRow';
import ProductPicker from '@/components/ProductPicker';
import { Text, View, useThemeColor } from '@/components/Themed';
import { calcQuoteTotals } from '@/lib/calc';
import { formatCurrency } from '@/lib/products';
import type { DiscountType, Product } from '@/lib/types';
import { useQuoteStore } from '@/store/quoteStore';

export default function QuoteBuilderScreen() {
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
  const barBg = useThemeColor(
    { light: '#ffffff', dark: '#111' },
    'background'
  );

  const quote = useQuoteStore((s) => s.quote);
  const items = useQuoteStore((s) => s.items);
  const loading = useQuoteStore((s) => s.loading);
  const saving = useQuoteStore((s) => s.saving);
  const loadError = useQuoteStore((s) => s.loadError);
  const loadQuote = useQuoteStore((s) => s.loadQuote);
  const updateQuoteFields = useQuoteStore((s) => s.updateQuoteFields);
  const addProduct = useQuoteStore((s) => s.addProduct);
  const setItemQuantity = useQuoteStore((s) => s.setItemQuantity);
  const setItemPrice = useQuoteStore((s) => s.setItemPrice);
  const removeItem = useQuoteStore((s) => s.removeItem);
  const flush = useQuoteStore((s) => s.flush);
  const reset = useQuoteStore((s) => s.reset);

  const [customerOpen, setCustomerOpen] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [discountText, setDiscountText] = useState('0');
  const [taxText, setTaxText] = useState('0');

  useFocusEffect(
    useCallback(() => {
      if (!quoteId) {
        router.back();
        return;
      }
      void loadQuote(quoteId);
      return () => {
        void flush();
        reset();
      };
    }, [flush, loadQuote, quoteId, reset, router])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        void flush();
      }
    });
    return () => sub.remove();
  }, [flush]);

  useEffect(() => {
    if (loadError) {
      router.back();
    }
  }, [loadError, router]);

  useEffect(() => {
    if (!quote) return;
    setDiscountText(String(quote.discount ?? 0));
    setTaxText(String(quote.taxRate ?? 0));
  }, [quote?.id, quote?.discount, quote?.taxRate]);

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

  const handleSelectProduct = useCallback(
    async (product: Product) => {
      await addProduct(product);
      setPickerOpen(false);
    },
    [addProduct]
  );

  const commitDiscount = () => {
    const parsed = Number(discountText.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDiscountText(String(quote?.discount ?? 0));
      return;
    }
    const next = Math.round(parsed * 100) / 100;
    setDiscountText(String(next));
    updateQuoteFields({ discount: next });
    void flush();
  };

  const commitTax = () => {
    const parsed = Number(taxText.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      setTaxText(String(quote?.taxRate ?? 0));
      return;
    }
    const next = Math.round(parsed * 100) / 100;
    setTaxText(String(next));
    updateQuoteFields({ taxRate: next });
    void flush();
  };

  const setDiscountType = (discountType: DiscountType) => {
    updateQuoteFields({ discountType });
    void flush();
  };

  if (loading || !quote) {
    return (
      <View style={[styles.centered, { backgroundColor: background }]}>
        <Stack.Screen options={{ title: 'Quote', headerBackTitle: 'Quotes' }} />
        <ActivityIndicator size="large" color={tint} />
      </View>
    );
  }

  const title = quote.customerName.trim() || 'New Quote';

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title,
          headerBackTitle: 'Quotes',
          headerRight: () =>
            saving ? (
              <Text style={[styles.saving, { color: tint }]}>Saving…</Text>
            ) : null,
        }}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 140 + insets.bottom }]}
        keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => setCustomerOpen((open) => !open)}
          style={[styles.sectionHeader, { borderColor }]}>
          <View style={styles.sectionHeaderText} lightColor="transparent" darkColor="transparent">
            <Text style={styles.sectionTitle}>Customer</Text>
            <Text style={styles.sectionHint} numberOfLines={1}>
              {quote.customerName.trim() || 'Add customer details'}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: tint }]}>
            {customerOpen ? 'Hide' : 'Show'}
          </Text>
        </Pressable>

        {customerOpen ? (
          <View style={styles.fields}>
            <FieldLabel>Name</FieldLabel>
            <TextInput
              value={quote.customerName}
              onChangeText={(customerName) => updateQuoteFields({ customerName })}
              onBlur={() => {
                void flush();
              }}
              placeholder="Customer name"
              placeholderTextColor="#999"
              style={[
                styles.input,
                { color: textColor, backgroundColor: fieldBg, borderColor },
              ]}
              autoCapitalize="words"
            />

            <FieldLabel>Phone</FieldLabel>
            <TextInput
              value={quote.phone}
              onChangeText={(phone) => updateQuoteFields({ phone })}
              onBlur={() => {
                void flush();
              }}
              placeholder="Phone"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              style={[
                styles.input,
                { color: textColor, backgroundColor: fieldBg, borderColor },
              ]}
            />

            <FieldLabel>Email</FieldLabel>
            <TextInput
              value={quote.email}
              onChangeText={(email) => updateQuoteFields({ email })}
              onBlur={() => {
                void flush();
              }}
              placeholder="Email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.input,
                { color: textColor, backgroundColor: fieldBg, borderColor },
              ]}
            />

            <FieldLabel>Address</FieldLabel>
            <TextInput
              value={quote.address}
              onChangeText={(address) => updateQuoteFields({ address })}
              onBlur={() => {
                void flush();
              }}
              placeholder="Service address"
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
              style={[
                styles.input,
                styles.multiline,
                { color: textColor, backgroundColor: fieldBg, borderColor },
              ]}
            />
          </View>
        ) : null}

        <View style={styles.itemsHeader} lightColor="transparent" darkColor="transparent">
          <Text style={styles.sectionTitle}>Line items</Text>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: tint },
              pressed && styles.pressed,
            ]}>
            <Text style={styles.addButtonText} lightColor="#fff" darkColor="#000">
              Add Product
            </Text>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View
            style={[styles.emptyItems, { backgroundColor: fieldBg, borderColor }]}>
            <Text style={styles.emptyItemsText}>
              No products yet. Tap Add Product to build this quote.
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <LineItemRow
              key={item.id}
              item={item}
              onQuantityChange={(quantity) => {
                void setItemQuantity(item.id, quantity);
              }}
              onPriceChange={(price) => {
                void setItemPrice(item.id, price);
              }}
              onRemove={() => {
                void removeItem(item.id);
              }}
            />
          ))
        )}

        <View style={[styles.adjustments, { borderColor, backgroundColor: fieldBg }]}>
          <Text style={styles.sectionTitle}>Adjustments</Text>

          <FieldLabel>Discount</FieldLabel>
          <View style={styles.discountRow} lightColor="transparent" darkColor="transparent">
            <View style={styles.typeToggle} lightColor="transparent" darkColor="transparent">
              {(['flat', 'percent'] as DiscountType[]).map((type) => {
                const selected = (quote.discountType ?? 'flat') === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setDiscountType(type)}
                    style={[
                      styles.typeChip,
                      {
                        borderColor: selected ? tint : borderColor,
                        backgroundColor: selected ? tint : background,
                      },
                    ]}>
                    <Text
                      style={styles.typeChipText}
                      lightColor={selected ? '#fff' : '#111'}
                      darkColor={selected ? '#000' : '#fff'}>
                      {type === 'flat' ? '$' : '%'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={discountText}
              onChangeText={setDiscountText}
              onBlur={commitDiscount}
              onSubmitEditing={commitDiscount}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                styles.discountInput,
                { color: textColor, backgroundColor: background, borderColor },
              ]}
            />
          </View>

          <FieldLabel>Tax rate (%)</FieldLabel>
          <TextInput
            value={taxText}
            onChangeText={setTaxText}
            onBlur={commitTax}
            onSubmitEditing={commitTax}
            keyboardType="decimal-pad"
            style={[
              styles.input,
              { color: textColor, backgroundColor: background, borderColor },
            ]}
          />
        </View>
      </ScrollView>

      <View
        style={[
          styles.stickyBar,
          {
            backgroundColor: barBg,
            borderColor,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}>
        <TotalsRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
        <TotalsRow
          label={`Discount (${quote.discountType === 'percent' ? '%' : '$'})`}
          value={`−${formatCurrency(totals.discountAmount)}`}
        />
        <TotalsRow label="Tax" value={formatCurrency(totals.tax)} />
        <View style={styles.grandRow} lightColor="transparent" darkColor="transparent">
          <Text style={styles.grandLabel}>Total</Text>
          <Text style={[styles.grandValue, { color: tint }]}>
            {formatCurrency(totals.grandTotal)}
          </Text>
        </View>
      </View>

      <ProductPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(product) => {
          void handleSelectProduct(product);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

function TotalsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totalRow} lightColor="transparent" darkColor="transparent">
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 8,
  },
  sectionHeader: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHint: {
    fontSize: 13,
    opacity: 0.55,
  },
  chevron: {
    fontSize: 14,
    fontWeight: '600',
  },
  fields: {
    gap: 6,
    marginBottom: 8,
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
  },
  multiline: {
    minHeight: 72,
    paddingTop: 12,
  },
  itemsHeader: {
    marginTop: 12,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
  emptyItems: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 18,
  },
  emptyItemsText: {
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 20,
  },
  adjustments: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  typeChip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipText: {
    fontSize: 16,
    fontWeight: '700',
  },
  discountInput: {
    flex: 1,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    opacity: 0.65,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  grandLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  grandValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  saving: {
    fontSize: 13,
    fontWeight: '600',
  },
});
