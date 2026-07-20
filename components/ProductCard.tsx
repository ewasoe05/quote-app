import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { formatCurrency, getProductDisplayPrice } from '@/lib/products';
import type { Product } from '@/lib/types';

type ProductCardProps = {
  product: Product;
  onPress?: (product: Product) => void;
};

export default function ProductCard({ product, onPress }: ProductCardProps) {
  const price = getProductDisplayPrice(product);

  return (
    <Pressable
      onPress={() => onPress?.(product)}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      disabled={!onPress}>
      <View
        style={styles.card}
        lightColor="#f7f8fa"
        darkColor="rgba(255,255,255,0.06)">
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.price}>{formatCurrency(price)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  price: {
    fontSize: 15,
    fontWeight: '500',
    opacity: 0.75,
  },
});
