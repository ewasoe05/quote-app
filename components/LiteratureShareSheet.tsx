import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View, useThemeColor } from '@/components/Themed';
import { formStyles } from '@/constants/Form';
import type { QuoteLiteratureOption } from '@/lib/quoteLiterature';

type LiteratureShareSheetProps = {
  visible: boolean;
  options: QuoteLiteratureOption[];
  loading?: boolean;
  confirming?: boolean;
  onClose: () => void;
  onConfirm: (selected: QuoteLiteratureOption[]) => void;
};

export default function LiteratureShareSheet({
  visible,
  options,
  loading = false,
  confirming = false,
  onClose,
  onConfirm,
}: LiteratureShareSheetProps) {
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

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) return;
    setSelectedKeys(new Set(options.map((option) => option.key)));
  }, [visible, options]);

  const selectedCount = selectedKeys.size;
  const allSelected =
    options.length > 0 && selectedCount === options.length;

  const groups = useMemo(() => {
    const map = new Map<string, QuoteLiteratureOption[]>();
    for (const option of options) {
      const list = map.get(option.productId) ?? [];
      list.push(option);
      map.set(option.productId, list);
    }
    return [...map.entries()].map(([productId, files]) => ({
      productId,
      productName: files[0]?.productName ?? 'Product',
      files,
    }));
  }, [options]);

  const toggle = (key: string) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(options.map((option) => option.key)));
    }
  };

  const handleConfirm = () => {
    const selected = options.filter((option) => selectedKeys.has(option.key));
    onConfirm(selected);
  };

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
            <Text style={styles.sheetTitle}>Include literature</Text>
            <Pressable onPress={onClose} hitSlop={8} disabled={confirming}>
              <Text style={[styles.done, { color: tint }]}>Cancel</Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>
            Choose product PDFs to send with the quote. Selected files are
            packed into one zip for a single share.
          </Text>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={tint} />
            </View>
          ) : options.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: fieldBg, borderColor }]}>
              <Text style={styles.emptyTitle}>No literature on this quote</Text>
              <Text style={styles.emptyBody}>
                Add PDFs on a product in the catalog, then add that product to
                the quote.
              </Text>
            </View>
          ) : (
            <>
              <Pressable
                onPress={toggleAll}
                style={({ pressed }) => [
                  styles.selectAll,
                  { borderColor },
                  pressed && formStyles.pressed,
                ]}>
                <Text style={[styles.selectAllText, { color: tint }]}>
                  {allSelected ? 'Deselect all' : 'Select all'}
                </Text>
                <Text style={styles.selectAllCount}>
                  {selectedCount} of {options.length}
                </Text>
              </Pressable>

              <FlatList
                data={groups}
                keyExtractor={(item) => item.productId}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                renderItem={({ item: group }) => (
                  <View style={styles.group} lightColor="transparent" darkColor="transparent">
                    <Text style={styles.groupTitle}>{group.productName}</Text>
                    {group.files.map((file) => {
                      const selected = selectedKeys.has(file.key);
                      return (
                        <Pressable
                          key={file.key}
                          onPress={() => toggle(file.key)}
                          style={({ pressed }) => [
                            styles.row,
                            {
                              backgroundColor: fieldBg,
                              borderColor: selected ? tint : borderColor,
                            },
                            pressed && formStyles.pressed,
                          ]}>
                          <View
                            style={[
                              styles.checkbox,
                              {
                                borderColor: selected ? tint : borderColor,
                                backgroundColor: selected ? tint : 'transparent',
                              },
                            ]}>
                            {selected ? (
                              <Text
                                style={styles.checkMark}
                                lightColor="#fff"
                                darkColor="#000">
                                ✓
                              </Text>
                            ) : null}
                          </View>
                          <Text
                            style={[styles.fileName, { color: textColor }]}
                            numberOfLines={2}>
                            {file.attachment.fileName}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              />
            </>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share quote with selected literature"
            disabled={confirming || loading}
            onPress={handleConfirm}
            style={({ pressed }) => [
              formStyles.primaryButton,
              styles.shareButton,
              { backgroundColor: tint },
              (pressed || confirming || loading) && formStyles.pressed,
            ]}>
            <Text style={formStyles.primaryButtonText} lightColor="#fff" darkColor="#000">
              {confirming
                ? 'Preparing…'
                : selectedCount > 0
                  ? `Share quote + ${selectedCount} PDF${selectedCount === 1 ? '' : 's'}`
                  : 'Share quote only'}
            </Text>
          </Pressable>
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
    minHeight: '45%',
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
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  done: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.6,
    marginBottom: 12,
  },
  loading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  empty: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 18,
    gap: 6,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.65,
  },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    marginBottom: 10,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectAllCount: {
    fontSize: 13,
    opacity: 0.55,
  },
  list: {
    flexGrow: 1,
    flexShrink: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  group: {
    marginBottom: 12,
    gap: 8,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.55,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '700',
  },
  fileName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  shareButton: {
    marginTop: 12,
  },
});
