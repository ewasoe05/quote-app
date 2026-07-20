import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { formatCurrency } from '@/lib/products';
import type { QuoteItem } from '@/lib/types';

type LineItemRowProps = {
  item: QuoteItem;
  onQuantityChange: (quantity: number) => void;
  onPriceChange: (price: number) => void;
  onRemove: () => void;
};

export default function LineItemRow({
  item,
  onQuantityChange,
  onPriceChange,
  onRemove,
}: LineItemRowProps) {
  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const fieldBg = useThemeColor(
    { light: '#fff', dark: 'rgba(255,255,255,0.08)' },
    'background'
  );
  const cardBg = useThemeColor(
    { light: '#f7f8fa', dark: 'rgba(255,255,255,0.06)' },
    'background'
  );
  const borderColor = useThemeColor(
    { light: '#dde1e6', dark: 'rgba(255,255,255,0.12)' },
    'text'
  );

  const [priceText, setPriceText] = useState(String(item.priceSnapshot));

  useEffect(() => {
    setPriceText(String(item.priceSnapshot));
  }, [item.priceSnapshot]);

  const lineTotal = item.priceSnapshot * item.quantity;

  const commitPrice = () => {
    const parsed = Number(priceText.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      setPriceText(String(item.priceSnapshot));
      return;
    }
    const next = Math.round(parsed * 100) / 100;
    setPriceText(String(next));
    if (next !== item.priceSnapshot) {
      onPriceChange(next);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.topRow} lightColor="transparent" darkColor="transparent">
        <Text style={styles.name} numberOfLines={2}>
          {item.nameSnapshot}
        </Text>
        <Pressable onPress={onRemove} hitSlop={12} accessibilityLabel="Remove item">
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      </View>

      <View style={styles.controls} lightColor="transparent" darkColor="transparent">
        <View style={styles.qtyBlock} lightColor="transparent" darkColor="transparent">
          <Text style={styles.controlLabel}>Qty</Text>
          <View style={styles.stepper} lightColor="transparent" darkColor="transparent">
            <Pressable
              onPress={() => onQuantityChange(Math.max(1, item.quantity - 1))}
              style={[styles.stepBtn, { borderColor, backgroundColor: fieldBg }]}
              accessibilityLabel="Decrease quantity">
              <Text style={[styles.stepBtnText, { color: tint }]}>−</Text>
            </Pressable>
            <Text style={styles.qtyValue}>{item.quantity}</Text>
            <Pressable
              onPress={() => onQuantityChange(item.quantity + 1)}
              style={[styles.stepBtn, { borderColor, backgroundColor: fieldBg }]}
              accessibilityLabel="Increase quantity">
              <Text style={[styles.stepBtnText, { color: tint }]}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.priceBlock} lightColor="transparent" darkColor="transparent">
          <Text style={styles.controlLabel}>Price</Text>
          <TextInput
            value={priceText}
            onChangeText={setPriceText}
            onBlur={commitPrice}
            onSubmitEditing={commitPrice}
            keyboardType="decimal-pad"
            style={[
              styles.priceInput,
              { color: textColor, backgroundColor: fieldBg, borderColor },
            ]}
          />
        </View>

        <View style={styles.lineTotalBlock} lightColor="transparent" darkColor="transparent">
          <Text style={styles.controlLabel}>Line</Text>
          <Text style={styles.lineTotal}>{formatCurrency(lineTotal)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  remove: {
    color: '#d11a2a',
    fontSize: 13,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  qtyBlock: {
    gap: 6,
  },
  priceBlock: {
    flex: 1,
    gap: 6,
  },
  lineTotalBlock: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 72,
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.55,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 24,
  },
  qtyValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  priceInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    minHeight: 44,
    paddingVertical: 10,
    fontSize: 16,
  },
  lineTotal: {
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 12,
  },
});
