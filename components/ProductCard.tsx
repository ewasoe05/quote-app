import { useRef } from 'react';
import { Alert, Animated, Pressable, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { Text, View } from '@/components/Themed';
import { formatCurrency, getProductDisplayPrice } from '@/lib/products';
import type { Product } from '@/lib/types';

type ProductCardProps = {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export default function ProductCard({
  product,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const price = getProductDisplayPrice(product);

  const confirmDelete = () => {
    swipeableRef.current?.close();
    Alert.alert(
      'Delete product?',
      `Remove “${product.name}” from the catalog? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(product),
        },
      ]
    );
  };

  const openActions = () => {
    Alert.alert(product.name, undefined, [
      {
        text: 'Edit',
        onPress: () => onEdit(product),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: confirmDelete,
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.8],
      extrapolate: 'clamp',
    });

    return (
      <Pressable onPress={confirmDelete} style={styles.deleteAction}>
        <Animated.Text style={[styles.deleteActionText, { transform: [{ scale }] }]}>
          Delete
        </Animated.Text>
      </Pressable>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      overshootRight={false}
      renderRightActions={renderRightActions}
      friction={2}>
      <Pressable
        onPress={() => onEdit(product)}
        onLongPress={openActions}
        delayLongPress={350}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
        <View
          style={[styles.card, !product.active && styles.inactiveCard]}
          lightColor="#f7f8fa"
          darkColor="rgba(255,255,255,0.06)">
          <View style={styles.nameBlock} lightColor="transparent" darkColor="transparent">
            <Text
              style={[styles.name, !product.active && styles.inactiveText]}
              numberOfLines={2}>
              {product.name}
            </Text>
            {!product.active ? (
              <Text style={styles.inactiveBadge}>Inactive</Text>
            ) : null}
          </View>
          <Text style={[styles.price, !product.active && styles.inactiveText]}>
            {formatCurrency(price)}
          </Text>
        </View>
      </Pressable>
    </Swipeable>
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
  inactiveCard: {
    opacity: 0.72,
  },
  nameBlock: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  inactiveBadge: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.55,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inactiveText: {
    opacity: 0.75,
  },
  price: {
    fontSize: 15,
    fontWeight: '500',
    opacity: 0.75,
  },
  deleteAction: {
    backgroundColor: '#d11a2a',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 8,
    marginRight: 16,
    borderRadius: 10,
    width: 88,
    paddingHorizontal: 16,
  },
  deleteActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
