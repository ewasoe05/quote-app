import { useCallback, useEffect, useState } from 'react';
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
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import ProductPicker from '@/components/ProductPicker';
import { Text, View, useThemeColor } from '@/components/Themed';
import { formatCurrency } from '@/lib/products';
import {
  calculateQuoteSubtotal,
  calculateQuoteTotal,
  formatQuoteTotal,
} from '@/lib/quotes';
import type { Product } from '@/lib/types';
import { useQuoteStore } from '@/store/quoteStore';

export default function QuoteBuilderScreen() {
  const router = useRouter();
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
  const saving = useQuoteStore((s) => s.saving);
  const loadError = useQuoteStore((s) => s.loadError);
  const loadQuote = useQuoteStore((s) => s.loadQuote);
  const updateCustomer = useQuoteStore((s) => s.updateCustomer);
  const addProduct = useQuoteStore((s) => s.addProduct);
  const flush = useQuoteStore((s) => s.flush);
  const reset = useQuoteStore((s) => s.reset);

  const [customerOpen, setCustomerOpen] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

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

  const title = quote?.customerName.trim() || 'New Quote';
  const subtotal = calculateQuoteSubtotal(items);
  const total = quote ? calculateQuoteTotal(quote, items) : 0;

  const handleSelectProduct = useCallback(
    async (product: Product) => {
      await addProduct(product);
      setPickerOpen(false);
    },
    [addProduct]
  );

  if (loading || !quote) {
    return (
      <View style={[styles.centered, { backgroundColor: background }]}>
        <Stack.Screen options={{ title: 'Quote', headerBackTitle: 'Quotes' }} />
        <ActivityIndicator size="large" color={tint} />
      </View>
    );
  }

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
        contentContainerStyle={styles.content}
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
              onChangeText={(customerName) => updateCustomer({ customerName })}
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
              onChangeText={(phone) => updateCustomer({ phone })}
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
              onChangeText={(email) => updateCustomer({ email })}
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
              onChangeText={(address) => updateCustomer({ address })}
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
            <View
              key={item.id}
              style={[styles.itemRow, { backgroundColor: fieldBg }]}>
              <View style={styles.itemText} lightColor="transparent" darkColor="transparent">
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.nameSnapshot}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} × {formatCurrency(item.priceSnapshot)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                {formatCurrency(item.priceSnapshot * item.quantity)}
              </Text>
            </View>
          ))
        )}

        <View style={[styles.totals, { borderColor }]}>
          <View style={styles.totalRow} lightColor="transparent" darkColor="transparent">
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.totalRow} lightColor="transparent" darkColor="transparent">
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{formatQuoteTotal(total)}</Text>
          </View>
        </View>
      </ScrollView>

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
    paddingBottom: 40,
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
  itemRow: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemMeta: {
    fontSize: 13,
    opacity: 0.55,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '600',
  },
  totals: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    opacity: 0.65,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  grandLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
  grandValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  saving: {
    fontSize: 13,
    fontWeight: '600',
  },
});
