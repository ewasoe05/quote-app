import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SectionList,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { FabButton } from '@/components/Buttons';
import EmptyState from '@/components/EmptyState';
import ProductCard from '@/components/ProductCard';
import { Text, View, useSurfaceColors } from '@/components/Themed';
import { fonts } from '@/constants/Typography';
import { deleteProduct, getAllProducts } from '@/lib/db';
import { groupProductsByCategory } from '@/lib/products';
import type { Product, ProductSection } from '@/lib/types';

export default function ProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { tint, background, surface, navy } = useSurfaceColors();

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

  const handleDelete = useCallback(async (product: Product) => {
    try {
      await deleteProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (err) {
      Alert.alert(
        'Delete failed',
        err instanceof Error ? err.message : 'Could not delete product.'
      );
    }
  }, []);

  const sections: ProductSection[] = groupProductsByCategory(products);
  const isEmpty = !loading && products.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tint} />
        </View>
      ) : isEmpty ? (
        <EmptyState
          title="No products yet"
          body="Add softeners, RO systems, iron filters, and add-ons to your catalog."
          actionLabel="Add product"
          onAction={openCreate}
        />
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
              lightColor={surface}
              darkColor={surface}>
              <Text style={[styles.sectionTitle, { color: navy }]}>
                {section.title}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled
        />
      )}

      {!isEmpty || loading ? (
        <FabButton accessibilityLabel="Add product" onPress={openCreate}>
          <Text style={styles.fabLabel} lightColor="#fff" darkColor="#fff">
            +
          </Text>
        </FabButton>
      ) : null}
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
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  fabLabel: {
    fontFamily: fonts.regular,
    fontSize: 32,
    lineHeight: 34,
  },
});
