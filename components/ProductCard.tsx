import { useRef } from 'react';
import { Alert, Animated, Pressable, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import ListCard from '@/components/ListCard';
import { Text, View, useSurfaceColors } from '@/components/Themed';
import { fonts } from '@/constants/Typography';
import { formatCurrency, getProductDisplayPrice } from '@/lib/products';
import type { Product } from '@/lib/types';

type ProductCardProps = {
  product: Product;
  catalog?: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export default function ProductCard({
  product,
  catalog,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const price = getProductDisplayPrice(product, catalog);
  const { danger, navy, muted } = useSurfaceColors();

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
      <Pressable
        onPress={confirmDelete}
        style={[styles.deleteAction, { backgroundColor: danger }]}>
        <Animated.Text
          style={[styles.deleteActionText, { transform: [{ scale }] }]}>
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
        <ListCard
          style={[styles.card, !product.active && styles.inactiveCard]}>
          <View style={styles.nameBlock} lightColor="transparent" darkColor="transparent">
            <Text
              style={[styles.name, { color: navy }, !product.active && styles.inactiveText]}
              numberOfLines={2}>
              {product.name}
            </Text>
            <View style={styles.badgeRow} lightColor="transparent" darkColor="transparent">
              {product.kind === 'package' ? (
                <Text style={[styles.kitBadge, { color: muted }]}>Kit</Text>
              ) : null}
              {!product.active ? (
                <Text style={[styles.inactiveBadge, { color: muted }]}>
                  Inactive
                </Text>
              ) : null}
            </View>
          </View>
          <Text
            style={[
              styles.price,
              { color: muted },
              !product.active && styles.inactiveText,
            ]}>
            {formatCurrency(price)}
          </Text>
        </ListCard>
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
    opacity: 0.85,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inactiveCard: {
    opacity: 0.72,
  },
  nameBlock: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  name: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  kitBadge: {
    fontFamily: fonts.bold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inactiveBadge: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inactiveText: {
    opacity: 0.75,
  },
  price: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 8,
    marginRight: 16,
    borderRadius: 12,
    width: 88,
    paddingHorizontal: 16,
  },
  deleteActionText: {
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: 14,
  },
});
