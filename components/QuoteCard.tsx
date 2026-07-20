import { useRef } from 'react';
import { Alert, Animated, Pressable, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { Text, View } from '@/components/Themed';
import {
  formatQuoteDate,
  formatQuoteTotal,
  getQuoteStatusLabel,
  type QuoteListItem,
} from '@/lib/quotes';
import type { QuoteStatus } from '@/lib/types';

type QuoteCardProps = {
  quote: QuoteListItem;
  onPress: (quote: QuoteListItem) => void;
  onDuplicate: (quote: QuoteListItem) => void;
  onDelete: (quote: QuoteListItem) => void;
};

const STATUS_COLORS: Record<
  QuoteStatus,
  { bg: string; text: string }
> = {
  draft: { bg: 'rgba(120,120,128,0.18)', text: '#636366' },
  sent: { bg: 'rgba(47,149,220,0.18)', text: '#1a6fa8' },
  won: { bg: 'rgba(52,199,89,0.18)', text: '#248a3d' },
  lost: { bg: 'rgba(209,26,42,0.16)', text: '#d11a2a' },
};

export default function QuoteCard({
  quote,
  onPress,
  onDuplicate,
  onDelete,
}: QuoteCardProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const statusColors = STATUS_COLORS[quote.status] ?? STATUS_COLORS.draft;
  const customerLabel = quote.customerName.trim() || 'Untitled quote';

  const confirmDelete = () => {
    swipeableRef.current?.close();
    Alert.alert(
      'Delete quote?',
      `Remove the quote for “${customerLabel}”? Line items will be deleted too.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(quote),
        },
      ]
    );
  };

  const handleDuplicate = () => {
    swipeableRef.current?.close();
    onDuplicate(quote);
  };

  const openActions = () => {
    Alert.alert(customerLabel, undefined, [
      { text: 'Open', onPress: () => onPress(quote) },
      { text: 'Duplicate', onPress: handleDuplicate },
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
      inputRange: [-140, 0],
      outputRange: [1, 0.85],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.actions} lightColor="transparent" darkColor="transparent">
        <Pressable onPress={handleDuplicate} style={styles.duplicateAction}>
          <Animated.Text
            style={[styles.actionText, { transform: [{ scale }] }]}>
            Duplicate
          </Animated.Text>
        </Pressable>
        <Pressable onPress={confirmDelete} style={styles.deleteAction}>
          <Animated.Text
            style={[styles.actionText, { transform: [{ scale }] }]}>
            Delete
          </Animated.Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      overshootRight={false}
      renderRightActions={renderRightActions}
      friction={2}>
      <Pressable
        onPress={() => onPress(quote)}
        onLongPress={openActions}
        delayLongPress={350}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
        <View
          style={styles.card}
          lightColor="#f7f8fa"
          darkColor="rgba(255,255,255,0.06)">
          <View style={styles.topRow} lightColor="transparent" darkColor="transparent">
            <Text style={styles.name} numberOfLines={1}>
              {customerLabel}
            </Text>
            <View
              style={[styles.badge, { backgroundColor: statusColors.bg }]}
              lightColor="transparent"
              darkColor="transparent">
              <Text style={[styles.badgeText, { color: statusColors.text }]}>
                {getQuoteStatusLabel(quote.status)}
              </Text>
            </View>
          </View>
          <View style={styles.bottomRow} lightColor="transparent" darkColor="transparent">
            <Text style={styles.meta}>{formatQuoteDate(quote.createdAt)}</Text>
            <Text style={styles.total}>{formatQuoteTotal(quote.total)}</Text>
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meta: {
    fontSize: 14,
    opacity: 0.6,
  },
  total: {
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    marginBottom: 10,
    marginRight: 16,
  },
  duplicateAction: {
    backgroundColor: '#2f95dc',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    width: 92,
    paddingHorizontal: 10,
  },
  deleteAction: {
    backgroundColor: '#d11a2a',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    width: 80,
    paddingHorizontal: 10,
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
