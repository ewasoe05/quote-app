import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

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
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ProductCategory,
} from '@/lib/types';

function parseMoney(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
}

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
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, router]);

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
        await updateProduct(productId, payload);
      } else {
        await createProduct(payload);
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
    category,
    description,
    laborPrice,
    name,
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
