import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import ProductCard from '@/components/ProductCard';
import { Text, View, useThemeColor } from '@/components/Themed';
import { deleteProduct, getAllProducts } from '@/lib/db';
import { groupProductsByCategory } from '@/lib/products';
import type { Product, ProductSection } from '@/lib/types';

export default function ProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');

  const loadProducts = useCallback(async () => {
    try {
      const rows = await getAllProducts();
      setProducts(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadProducts();
    }, [loadProducts])
  );

  const openCreate = useCallback(() => {
    router.push('/products/edit');
  }, [router]);

  const openEdit = useCallback(
    (product: Product) => {
      router.push({
        pathname: '/products/edit',
        params: { id: product.id },
      });
    },
    [router]
  );

  const handleDelete = useCallback(
    async (product: Product) => {
      try {
        await deleteProduct(product.id);
        setProducts((current) =>
          current.filter((item) => item.id !== product.id)
        );
      } catch (err) {
        Alert.alert(
          'Delete failed',
          err instanceof Error ? err.message : 'Could not delete product.'
        );
      }
    },
    []
  );

  const sections: ProductSection[] = groupProductsByCategory(products);
  const isEmpty = !loading && products.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tint} />
        </View>
      ) : isEmpty ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No products yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap + to add softeners, RO systems, iron filters, and add-ons to
            your catalog.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              catalog={products}
              onEdit={openEdit}
              onDelete={(product) => {
                void handleDelete(product);
              }}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View
              style={styles.sectionHeader}
              lightColor="#fff"
              darkColor="#000">
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add product"
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: tint },
          pressed && styles.fabPressed,
        ]}
        onPress={openCreate}>
        <Text style={styles.fabLabel} lightColor="#fff" darkColor="#000">
          +
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingBottom: 96,
    paddingTop: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    opacity: 0.55,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabPressed: {
    opacity: 0.85,
  },
  fabLabel: {
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 34,
  },
});
