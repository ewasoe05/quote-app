import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View, useThemeColor } from '@/components/Themed';
import { getAllProducts } from '@/lib/db';
import {
  formatCurrency,
  getProductDisplayPrice,
} from '@/lib/products';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type Product,
  type ProductCategory,
} from '@/lib/types';

type ProductPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
};

type CategoryFilter = 'all' | ProductCategory;

export default function ProductPicker({
  visible,
  onClose,
  onSelect,
}: ProductPickerProps) {
  const insets = useSafeAreaInsets();
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

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setLoading(true);
    setQuery('');
    setCategory('all');

    (async () => {
      try {
        const rows = await getAllProducts({ activeOnly: true });
        if (!cancelled) setProducts(rows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      if (category !== 'all' && product.category !== category) return false;
      if (!needle) return true;
      return (
        product.name.toLowerCase().includes(needle) ||
        product.description.toLowerCase().includes(needle)
      );
    });
  }, [products, query, category]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <RNView style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: background,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}>
          <View style={styles.handleWrap} lightColor="transparent" darkColor="transparent">
            <RNView style={styles.handle} />
          </View>

          <View style={styles.sheetHeader} lightColor="transparent" darkColor="transparent">
            <Text style={styles.sheetTitle}>Add Product</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={[styles.done, { color: tint }]}>Done</Text>
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search products"
            placeholderTextColor="#999"
            style={[
              styles.search,
              { color: textColor, backgroundColor: fieldBg, borderColor },
            ]}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />

          <FlatList
            horizontal
            data={['all', ...PRODUCT_CATEGORIES] as CategoryFilter[]}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            renderItem={({ item }) => {
              const selected = item === category;
              const label =
                item === 'all' ? 'All' : PRODUCT_CATEGORY_LABELS[item];
              return (
                <Pressable
                  onPress={() => setCategory(item)}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? tint : borderColor,
                      backgroundColor: selected ? tint : fieldBg,
                    },
                  ]}>
                  <Text
                    style={styles.chipText}
                    lightColor={selected ? '#fff' : '#111'}
                    darkColor={selected ? '#000' : '#fff'}>
                    {label}
                  </Text>
                </Pressable>
              );
            }}
          />

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={tint} />
            </View>
          ) : (
            <FlatList
              style={styles.productList}
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                filtered.length === 0 ? styles.emptyList : styles.list
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>No matching products</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: fieldBg },
                    pressed && styles.rowPressed,
                  ]}>
                  <View style={styles.rowText} lightColor="transparent" darkColor="transparent">
                    <View style={styles.rowTitle} lightColor="transparent" darkColor="transparent">
                      <Text style={styles.rowName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {(item.attachments?.length ?? 0) > 0 ? (
                        <View
                          style={[
                            styles.litBadge,
                            { borderColor, backgroundColor: background },
                          ]}>
                          <Text style={[styles.litBadgeText, { color: tint }]}>
                            PDF
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.rowCategory}>
                      {PRODUCT_CATEGORY_LABELS[item.category]}
                    </Text>
                  </View>
                  <Text style={styles.rowPrice}>
                    {formatCurrency(getProductDisplayPrice(item))}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </RNView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    maxHeight: '82%',
    minHeight: '55%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handleWrap: {
    alignItems: 'center',
    marginBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120,120,128,0.35)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  done: {
    fontSize: 16,
    fontWeight: '600',
  },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  chips: {
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  productList: {
    flexGrow: 1,
    flexShrink: 1,
  },
  list: {
    paddingBottom: 12,
  },
  emptyList: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  rowPressed: {
    opacity: 0.75,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  litBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  litBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  rowCategory: {
    fontSize: 12,
    opacity: 0.55,
  },
  rowPrice: {
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.8,
  },
});
