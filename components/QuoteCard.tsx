import { useRef } from 'react';
import { Alert, Animated, Pressable, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { Text, View } from '@/components/Themed';
import {
  isFollowUpDue,
  isFollowUpDueToday,
  toDateInputValue,
} from '@/lib/quoteDocument';
import {
  formatQuoteDate,
  formatQuoteNumber,
  formatQuoteTotal,
  getQuoteStatusLabel,
  type QuoteListItem,
} from '@/lib/quotes';
import type { QuoteStatus } from '@/lib/types';

type QuoteCardProps = {
  quote: QuoteListItem;
  onPress: (quote: QuoteListItem) => void;
  onDuplicate: (quote: QuoteListItem) => void;
  onDuplicateNewCustomer: (quote: QuoteListItem) => void;
  onUseTemplate: (quote: QuoteListItem) => void;
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
  onDuplicateNewCustomer,
  onUseTemplate,
  onDelete,
}: QuoteCardProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const statusColors = STATUS_COLORS[quote.status] ?? STATUS_COLORS.draft;
  const customerLabel = quote.isTemplate
    ? quote.notes.trim() || quote.customerName.trim() || 'Untitled template'
    : quote.customerName.trim() || 'Untitled quote';
  const quoteRef = formatQuoteNumber(quote.quoteNumber);
  const today = toDateInputValue(new Date());
  const dueToday = isFollowUpDueToday(quote.followUpDate, today);
  const needsFollowUp =
    !quote.isTemplate && isFollowUpDue(quote.followUpDate, today);

  const confirmDelete = () => {
    swipeableRef.current?.close();
    Alert.alert(
      quote.isTemplate ? 'Delete template?' : 'Delete quote?',
      quote.isTemplate
        ? `Remove “${customerLabel}” from templates?`
        : `Remove the quote for “${customerLabel}”? Line items will be deleted too.`,
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

  const openActions = () => {
    const buttons = quote.isTemplate
      ? [
          { text: 'Open', onPress: () => onPress(quote) },
          {
            text: 'New quote from template',
            onPress: () => {
              swipeableRef.current?.close();
              onUseTemplate(quote);
            },
          },
          {
            text: 'Delete',
            style: 'destructive' as const,
            onPress: confirmDelete,
          },
          { text: 'Cancel', style: 'cancel' as const },
        ]
      : [
          { text: 'Open', onPress: () => onPress(quote) },
          {
            text: 'Duplicate',
            onPress: () => {
              swipeableRef.current?.close();
              onDuplicate(quote);
            },
          },
          {
            text: 'Duplicate as new customer',
            onPress: () => {
              swipeableRef.current?.close();
              onDuplicateNewCustomer(quote);
            },
          },
          {
            text: 'Delete',
            style: 'destructive' as const,
            onPress: confirmDelete,
          },
          { text: 'Cancel', style: 'cancel' as const },
        ];
    Alert.alert(customerLabel, undefined, buttons);
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
        <Pressable
          onPress={() => {
            swipeableRef.current?.close();
            if (quote.isTemplate) onUseTemplate(quote);
            else onDuplicate(quote);
          }}
          style={styles.duplicateAction}>
          <Animated.Text
            style={[styles.actionText, { transform: [{ scale }] }]}>
            {quote.isTemplate ? 'Use' : 'Duplicate'}
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
            <View style={styles.badges} lightColor="transparent" darkColor="transparent">
              {quote.isTemplate ? (
                <View style={[styles.badge, styles.templateBadge]}>
                  <Text style={[styles.badgeText, { color: '#5b4bb7' }]}>
                    Template
                  </Text>
                </View>
              ) : (
                <View
                  style={[styles.badge, { backgroundColor: statusColors.bg }]}>
                  <Text style={[styles.badgeText, { color: statusColors.text }]}>
                    {getQuoteStatusLabel(quote.status)}
                  </Text>
                </View>
              )}
              {dueToday ? (
                <View style={[styles.badge, styles.dueBadge]}>
                  <Text style={[styles.badgeText, { color: '#b35b00' }]}>
                    Due today
                  </Text>
                </View>
              ) : needsFollowUp ? (
                <View style={[styles.badge, styles.overdueBadge]}>
                  <Text style={[styles.badgeText, { color: '#d11a2a' }]}>
                    Follow up
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.bottomRow} lightColor="transparent" darkColor="transparent">
            <Text style={styles.meta}>
              {quoteRef ? `${quoteRef} · ` : ''}
              {quote.followUpDate && !quote.isTemplate
                ? `Follow-up ${quote.followUpDate}`
                : formatQuoteDate(quote.createdAt)}
            </Text>
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
    maxWidth: '48%',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  templateBadge: {
    backgroundColor: 'rgba(91,75,183,0.16)',
  },
  dueBadge: {
    backgroundColor: 'rgba(255,149,0,0.18)',
  },
  overdueBadge: {
    backgroundColor: 'rgba(209,26,42,0.14)',
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
    flex: 1,
    fontSize: 14,
    opacity: 0.6,
    marginRight: 8,
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
