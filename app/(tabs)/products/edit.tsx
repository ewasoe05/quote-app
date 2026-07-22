import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View as RNView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FieldLabel from '@/components/FieldLabel';
import KeyboardForm from '@/components/KeyboardForm';
import ProductPicker from '@/components/ProductPicker';
import { Text, View, useSurfaceColors } from '@/components/Themed';
import { formStyles } from '@/constants/Form';
import { fonts } from '@/constants/Typography';
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
} from '@/lib/db';
import {
  clearProductAttachment,
  persistProductAttachment,
} from '@/lib/productFiles';
import {
  formatCurrency,
  getPackageDisplayPrice,
  marginFromCostSell,
  sellFromCostMargin,
} from '@/lib/products';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type PackageComponent,
  type Product,
  type ProductAttachment,
  type ProductCategory,
  type ProductKind,
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
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = typeof id === 'string' && id.length > 0 ? id : undefined;
  const isEditing = Boolean(productId);

  const {
    tint,
    text: textColor,
    background,
    field: fieldBg,
    border: borderColor,
  } = useSurfaceColors();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('softeners');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [laborPrice, setLaborPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [marginPercent, setMarginPercent] = useState('');
  const [kind, setKind] = useState<ProductKind>('standard');
  const [components, setComponents] = useState<PackageComponent[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [componentPickerOpen, setComponentPickerOpen] = useState(false);
  const [active, setActive] = useState(true);
  const [attachments, setAttachments] = useState<ProductAttachment[]>([]);
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

  const refreshCatalog = useCallback(async () => {
    const rows = await getAllProducts({ activeOnly: true });
    setCatalog(
      rows.filter(
        (product) =>
          product.kind !== 'package' && product.id !== productId
      )
    );
  }, [productId]);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

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
        setCostPrice(product.costPrice === 0 ? '' : String(product.costPrice));
        setMarginPercent(
          product.marginPercent === 0 ? '' : String(product.marginPercent)
        );
        setKind(product.kind === 'package' ? 'package' : 'standard');
        setComponents(product.components ?? []);
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

  const packageRollup = useMemo(() => {
    if (kind !== 'package') return 0;
    return getPackageDisplayPrice(
      {
        id: productId ?? 'new',
        name: name || 'Package',
        category,
        description,
        unitPrice: 0,
        laborPrice: 0,
        active: true,
        attachments: [],
        kind: 'package',
        components,
        costPrice: 0,
        marginPercent: 0,
      },
      catalog
    );
  }, [catalog, category, components, description, kind, name, productId]);

  const componentRows = useMemo(() => {
    const byId = new Map(catalog.map((product) => [product.id, product]));
    return components
      .map((component) => {
        const product = byId.get(component.productId);
        return product
          ? { component, product }
          : {
              component,
              product: null as Product | null,
            };
      })
      .filter((row) => row.product);
  }, [catalog, components]);

  const applyCostMarginToSell = useCallback(
    (nextCostText: string, nextMarginText: string) => {
      const cost = parseMoney(nextCostText);
      const margin = parseMoney(nextMarginText);
      if (cost === null || margin === null) return;
      if (cost <= 0 && margin <= 0) return;
      const sell = sellFromCostMargin(cost, margin);
      setUnitPrice(String(sell));
    },
    []
  );

  const handleCostChange = (value: string) => {
    setCostPrice(value);
    applyCostMarginToSell(value, marginPercent);
  };

  const handleMarginChange = (value: string) => {
    setMarginPercent(value);
    applyCostMarginToSell(costPrice, value);
  };

  const handleUnitPriceChange = (value: string) => {
    setUnitPrice(value);
    const cost = parseMoney(costPrice);
    const sell = parseMoney(value);
    if (cost === null || sell === null || cost <= 0 || sell <= 0) return;
    setMarginPercent(String(marginFromCostSell(cost, sell)));
  };

  const setComponentQuantity = (productIdToUpdate: string, quantity: number) => {
    const nextQty = Math.max(1, Math.floor(quantity));
    setComponents((current) =>
      current.map((item) =>
        item.productId === productIdToUpdate
          ? { ...item, quantity: nextQty }
          : item
      )
    );
  };

  const removeComponent = (productIdToRemove: string) => {
    setComponents((current) =>
      current.filter((item) => item.productId !== productIdToRemove)
    );
  };

  const addComponent = (product: Product) => {
    setComponents((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...current, { productId: product.id, quantity: 1 }];
    });
    setComponentPickerOpen(false);
  };

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
                  const next = current.filter(
                    (item) => item.id !== attachment.id
                  );
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

  const handleRemovePending = useCallback((pendingId: string) => {
    setPendingAttachments((current) =>
      current.filter((item) => item.id !== pendingId)
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
    const parsedCost = parseMoney(costPrice);
    const parsedMargin = parseMoney(marginPercent);
    if (
      parsedUnit === null ||
      parsedLabor === null ||
      parsedCost === null ||
      parsedMargin === null
    ) {
      Alert.alert(
        'Invalid price',
        'Prices and margin must be zero or a positive number.'
      );
      return;
    }
    if (parsedMargin >= 100) {
      Alert.alert('Invalid margin', 'Margin percent must be less than 100.');
      return;
    }
    if (kind === 'package' && components.length === 0) {
      Alert.alert(
        'Add kit items',
        'A package needs at least one catalog product.'
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: trimmedName,
        category,
        description: description.trim(),
        unitPrice: kind === 'package' ? packageRollup : parsedUnit,
        laborPrice: kind === 'package' ? 0 : parsedLabor,
        active,
        kind,
        components: kind === 'package' ? components : [],
        costPrice: kind === 'package' ? 0 : parsedCost,
        marginPercent: kind === 'package' ? 0 : parsedMargin,
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
    components,
    costPrice,
    description,
    kind,
    laborPrice,
    marginPercent,
    name,
    packageRollup,
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

  const pickerCandidates = catalog.filter(
    (product) => !components.some((item) => item.productId === product.id)
  );

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

        <FieldLabel>Type</FieldLabel>
        <View style={styles.categoryRow}>
          {(
            [
              { value: 'standard', label: 'Product' },
              { value: 'package', label: 'Package / kit' },
            ] as const
          ).map((option) => {
            const selected = kind === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setKind(option.value)}
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
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

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

        {kind === 'package' ? (
          <>
            <FieldLabel>Kit contents</FieldLabel>
            <Text style={styles.attachHint}>
              Adding this kit to a quote inserts each product below as its own
              line item.
            </Text>
            {componentRows.length === 0 ? (
              <View
                style={[
                  styles.emptyAttach,
                  { backgroundColor: fieldBg, borderColor },
                ]}>
                <Text style={styles.emptyAttachText}>
                  No products in this kit yet.
                </Text>
              </View>
            ) : (
              componentRows.map(({ component, product }) => (
                <View
                  key={component.productId}
                  style={[
                    styles.attachRow,
                    { backgroundColor: fieldBg, borderColor },
                  ]}>
                  <View style={styles.attachInfo}>
                    <Text style={styles.attachName} numberOfLines={2}>
                      {product!.name}
                    </Text>
                    <Text style={styles.componentMeta}>
                      {formatCurrency(
                        (product!.unitPrice + product!.laborPrice) *
                          component.quantity
                      )}
                    </Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <Pressable
                      onPress={() =>
                        setComponentQuantity(
                          component.productId,
                          component.quantity - 1
                        )
                      }
                      style={[styles.qtyBtn, { borderColor }]}>
                      <Text style={styles.qtyBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.qtyValue}>{component.quantity}</Text>
                    <Pressable
                      onPress={() =>
                        setComponentQuantity(
                          component.productId,
                          component.quantity + 1
                        )
                      }
                      style={[styles.qtyBtn, { borderColor }]}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => removeComponent(component.productId)}
                    hitSlop={10}
                    style={styles.removeAttach}>
                    <Text style={styles.removeAttachText}>Remove</Text>
                  </Pressable>
                </View>
              ))
            )}
            <Pressable
              onPress={() => {
                void refreshCatalog().then(() => setComponentPickerOpen(true));
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor, backgroundColor: fieldBg },
                pressed && formStyles.pressed,
              ]}>
              <Text style={[styles.secondaryButtonText, { color: tint }]}>
                Add product to kit
              </Text>
            </Pressable>
            <Text style={styles.rollup}>
              Kit total (catalog): {formatCurrency(packageRollup)}
            </Text>
          </>
        ) : (
          <>
            <FieldLabel>Cost (dealer)</FieldLabel>
            <TextInput
              value={costPrice}
              onChangeText={handleCostChange}
              placeholder="0.00"
              placeholderTextColor="#999"
              style={[
                formStyles.input,
                { color: textColor, backgroundColor: fieldBg, borderColor },
              ]}
              keyboardType="decimal-pad"
            />

            <FieldLabel>Margin (%)</FieldLabel>
            <TextInput
              value={marginPercent}
              onChangeText={handleMarginChange}
              placeholder="0"
              placeholderTextColor="#999"
              style={[
                formStyles.input,
                { color: textColor, backgroundColor: fieldBg, borderColor },
              ]}
              keyboardType="decimal-pad"
            />
            <Text style={styles.attachHint}>
              Cost + margin fill unit price (margin is % of sell). Editing unit
              price updates margin when cost is set.
            </Text>

            <FieldLabel>Unit price</FieldLabel>
            <TextInput
              value={unitPrice}
              onChangeText={handleUnitPriceChange}
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
          </>
        )}

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

      <Modal
        visible={componentPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setComponentPickerOpen(false)}>
        <RNView style={styles.backdrop}>
          <Pressable
            style={styles.dismissArea}
            onPress={() => setComponentPickerOpen(false)}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: background,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add to kit</Text>
              <Pressable onPress={() => setComponentPickerOpen(false)}>
                <Text style={{ color: tint, fontWeight: '600' }}>Done</Text>
              </Pressable>
            </View>
            <FlatList
              data={pickerCandidates}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={styles.emptyAttachText}>
                  No other active products available.
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => addComponent(item)}
                  style={[
                    styles.pickerRow,
                    { backgroundColor: fieldBg, borderColor },
                  ]}>
                  <Text style={styles.attachName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.componentMeta}>
                    {formatCurrency(item.unitPrice + item.laborPrice)}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </RNView>
      </Modal>
    </>
  );
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
  rollup: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.75,
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
  componentMeta: {
    fontSize: 12,
    opacity: 0.55,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: '600',
  },
  qtyValue: {
    minWidth: 20,
    textAlign: 'center',
    fontWeight: '700',
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
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
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
  pickerRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});
