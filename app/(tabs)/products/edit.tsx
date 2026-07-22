import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';

import KeyboardForm from '@/components/KeyboardForm';
import { Text, View, useThemeColor } from '@/components/Themed';
import { formStyles } from '@/constants/Form';
import {
  createProduct,
  deleteProduct,
  getProductById,
  updateProduct,
} from '@/lib/db';
import {
  clearProductAttachment,
  persistProductAttachment,
} from '@/lib/productFiles';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ProductAttachment,
  type ProductCategory,
} from '@/lib/types';

function parseMoney(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
}

type PendingAttachment = {
  id: string;
  fileName: string;
  sourceUri: string;
};

export default function EditProductScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = typeof id === 'string' && id.length > 0 ? id : undefined;
  const isEditing = Boolean(productId);

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

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('softeners');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [laborPrice, setLaborPrice] = useState('');
  const [active, setActive] = useState(true);
  const [attachments, setAttachments] = useState<ProductAttachment[]>([]);
  /** PDFs picked before the product row exists (create flow). */
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);

  useEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  useEffect(() => {
    if (!productId) return;

    let cancelled = false;
    (async () => {
      try {
        const product = await getProductById(productId);
        if (cancelled) return;
        if (!product) {
          Alert.alert('Not found', 'That product no longer exists.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
        setName(product.name);
        setCategory(product.category);
        setDescription(product.description);
        setUnitPrice(String(product.unitPrice));
        setLaborPrice(
          product.laborPrice === 0 ? '' : String(product.laborPrice)
        );
        setActive(product.active);
        setAttachments(product.attachments ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, router]);

  const handleAddPdf = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled || !result.assets?.length) return;

      if (productId) {
        const added: ProductAttachment[] = [];
        for (const asset of result.assets) {
          const saved = await persistProductAttachment(
            productId,
            asset.uri,
            asset.name || 'literature.pdf'
          );
          added.push(saved);
        }
        setAttachments((current) => {
          const next = [...current, ...added];
          void updateProduct(productId, { attachments: next });
          return next;
        });
      } else {
        const staged = result.assets.map((asset, index) => ({
          id: `pending-${Date.now()}-${index}`,
          fileName: asset.name || 'literature.pdf',
          sourceUri: asset.uri,
        }));
        setPendingAttachments((current) => [...current, ...staged]);
      }
    } catch (err) {
      Alert.alert(
        'Could not add PDF',
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    }
  }, [productId]);

  const handleOpenAttachment = useCallback(async (uri: string) => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert(
          'Cannot open PDF',
          'Sharing is not available on this device.'
        );
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Open product PDF',
      });
    } catch (err) {
      Alert.alert(
        'Could not open PDF',
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    }
  }, []);

  const handleRemoveAttachment = useCallback(
    (attachment: ProductAttachment) => {
      Alert.alert(
        'Remove PDF?',
        `Remove “${attachment.fileName}” from this product?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                await clearProductAttachment(attachment.uri);
                setAttachments((current) => {
                  const next = current.filter((item) => item.id !== attachment.id);
                  if (productId) {
                    void updateProduct(productId, { attachments: next });
                  }
                  return next;
                });
              })();
            },
          },
        ]
      );
    },
    [productId]
  );

  const handleRemovePending = useCallback((id: string) => {
    setPendingAttachments((current) =>
      current.filter((item) => item.id !== id)
    );
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Enter a product name before saving.');
      return;
    }

    const parsedUnit = parseMoney(unitPrice);
    const parsedLabor = parseMoney(laborPrice);
    if (parsedUnit === null || parsedLabor === null) {
      Alert.alert(
        'Invalid price',
        'Unit and labor prices must be zero or a positive number.'
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: trimmedName,
        category,
        description: description.trim(),
        unitPrice: parsedUnit,
        laborPrice: parsedLabor,
        active,
      };

      if (productId) {
        await updateProduct(productId, {
          ...payload,
          attachments,
        });
      } else {
        const created = await createProduct({
          ...payload,
          attachments: [],
        });

        const savedAttachments: ProductAttachment[] = [];
        for (const pending of pendingAttachments) {
          const saved = await persistProductAttachment(
            created.id,
            pending.sourceUri,
            pending.fileName
          );
          savedAttachments.push(saved);
        }

        if (savedAttachments.length > 0) {
          await updateProduct(created.id, { attachments: savedAttachments });
        }
      }
      router.back();
    } catch (err) {
      Alert.alert(
        'Save failed',
        err instanceof Error ? err.message : 'Could not save product.'
      );
    } finally {
      setSaving(false);
    }
  }, [
    active,
    attachments,
    category,
    description,
    laborPrice,
    name,
    pendingAttachments,
    productId,
    router,
    unitPrice,
  ]);

  const handleDelete = useCallback(() => {
    if (!productId) return;

    Alert.alert(
      'Delete product?',
      `Remove “${name.trim() || 'this product'}” from the catalog? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setSaving(true);
              try {
                await deleteProduct(productId);
                router.back();
              } catch (err) {
                Alert.alert(
                  'Delete failed',
                  err instanceof Error ? err.message : 'Could not delete product.'
                );
              } finally {
                setSaving(false);
              }
            })();
          },
        },
      ]
    );
  }, [name, productId, router]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: background }]}>
        <Stack.Screen
          options={{ title: isEditing ? 'Edit Product' : 'Add Product' }}
        />
        <ActivityIndicator size="large" color={tint} />
      </View>
    );
  }

  type ListedAttachment = {
    id: string;
    fileName: string;
    uri: string;
    pending: boolean;
  };

  const listedAttachments: ListedAttachment[] = isEditing
    ? attachments.map((item) => ({ ...item, pending: false }))
    : pendingAttachments.map((item) => ({
        id: item.id,
        fileName: item.fileName,
        uri: item.sourceUri,
        pending: true,
      }));

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit Product' : 'Add Product',
          headerRight: () => (
            <Pressable
              onPress={() => void handleSave()}
              disabled={saving}
              hitSlop={12}
              style={({ pressed }) => pressed && styles.headerPressed}>
              <Text style={[styles.headerAction, { color: tint }]}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
          ),
        }}
      />

      <KeyboardForm style={{ backgroundColor: background }}>
        <FieldLabel>Name</FieldLabel>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Product name"
          placeholderTextColor="#999"
          style={[
            formStyles.input,
            { color: textColor, backgroundColor: fieldBg, borderColor },
          ]}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <FieldLabel>Category</FieldLabel>
        <View style={styles.categoryRow}>
          {PRODUCT_CATEGORIES.map((value) => {
            const selected = value === category;
            return (
              <Pressable
                key={value}
                onPress={() => setCategory(value)}
                style={[
                  formStyles.chip,
                  {
                    borderColor: selected ? tint : borderColor,
                    backgroundColor: selected ? tint : fieldBg,
                  },
                ]}>
                <Text
                  style={formStyles.chipText}
                  lightColor={selected ? '#fff' : '#111'}
                  darkColor={selected ? '#000' : '#fff'}>
                  {PRODUCT_CATEGORY_LABELS[value]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <FieldLabel>Description</FieldLabel>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Optional details"
          placeholderTextColor="#999"
          style={[
            formStyles.input,
            formStyles.multiline,
            { color: textColor, backgroundColor: fieldBg, borderColor },
          ]}
          multiline
          textAlignVertical="top"
        />

        <FieldLabel>Unit price</FieldLabel>
        <TextInput
          value={unitPrice}
          onChangeText={setUnitPrice}
          placeholder="0.00"
          placeholderTextColor="#999"
          style={[
            formStyles.input,
            { color: textColor, backgroundColor: fieldBg, borderColor },
          ]}
          keyboardType="decimal-pad"
        />

        <FieldLabel>Labor price (optional)</FieldLabel>
        <TextInput
          value={laborPrice}
          onChangeText={setLaborPrice}
          placeholder="0.00"
          placeholderTextColor="#999"
          style={[
            formStyles.input,
            { color: textColor, backgroundColor: fieldBg, borderColor },
          ]}
          keyboardType="decimal-pad"
        />

        <FieldLabel>Pictures & literature (PDF)</FieldLabel>
        <Text style={styles.attachHint}>
          Upload PDF cut sheets, photos, or product literature for this item.
        </Text>

        {listedAttachments.length === 0 ? (
          <View
            style={[
              styles.emptyAttach,
              { backgroundColor: fieldBg, borderColor },
            ]}>
            <Text style={styles.emptyAttachText}>No PDFs attached yet.</Text>
          </View>
        ) : (
          listedAttachments.map((item) => (
            <View
              key={item.id}
              style={[
                styles.attachRow,
                { backgroundColor: fieldBg, borderColor },
              ]}>
              <Pressable
                style={styles.attachInfo}
                onPress={() => {
                  if (item.pending) return;
                  void handleOpenAttachment(item.uri);
                }}
                disabled={item.pending}>
                <Text style={styles.attachName} numberOfLines={2}>
                  {item.fileName}
                </Text>
                <Text style={[styles.attachAction, { color: tint }]}>
                  {item.pending ? 'Ready to save' : 'Open / Share'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (item.pending) {
                    handleRemovePending(item.id);
                  } else {
                    handleRemoveAttachment({
                      id: item.id,
                      fileName: item.fileName,
                      uri: item.uri,
                    });
                  }
                }}
                hitSlop={10}
                style={styles.removeAttach}>
                <Text style={styles.removeAttachText}>Remove</Text>
              </Pressable>
            </View>
          ))
        )}

        <Pressable
          onPress={() => {
            void handleAddPdf();
          }}
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor, backgroundColor: fieldBg },
            pressed && formStyles.pressed,
          ]}>
          <Text style={[styles.secondaryButtonText, { color: tint }]}>
            Add PDF
          </Text>
        </Pressable>

        <View
          style={[
            styles.toggleRow,
            { backgroundColor: fieldBg, borderColor },
          ]}>
          <Text style={styles.toggleLabel}>Active in catalog</Text>
          <Switch
            value={active}
            onValueChange={setActive}
            trackColor={{ true: tint, false: '#ccc' }}
          />
        </View>

        <Pressable
          onPress={() => void handleSave()}
          disabled={saving}
          style={({ pressed }) => [
            formStyles.primaryButton,
            { backgroundColor: tint },
            (pressed || saving) && formStyles.pressed,
          ]}>
          <Text style={formStyles.primaryButtonText} lightColor="#fff" darkColor="#000">
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create product'}
          </Text>
        </Pressable>

        {isEditing ? (
          <Pressable
            onPress={handleDelete}
            disabled={saving}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && formStyles.pressed,
            ]}>
            <Text style={styles.deleteButtonText}>Delete product</Text>
          </Pressable>
        ) : null}
      </KeyboardForm>
    </>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={formStyles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachHint: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 8,
    lineHeight: 18,
  },
  emptyAttach: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  emptyAttachText: {
    opacity: 0.55,
    fontSize: 14,
  },
  attachRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachInfo: {
    flex: 1,
    gap: 2,
  },
  attachName: {
    fontSize: 14,
    fontWeight: '600',
  },
  attachAction: {
    fontSize: 13,
    fontWeight: '600',
  },
  removeAttach: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  removeAttachText: {
    color: '#d11a2a',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleRow: {
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    marginTop: 12,
    borderRadius: 12,
    minHeight: 52,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d11a2a',
  },
  headerAction: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerPressed: {
    opacity: 0.6,
  },
});
