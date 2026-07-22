import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import FieldLabel from '@/components/FieldLabel';
import KeyboardForm from '@/components/KeyboardForm';
import LineItemRow from '@/components/LineItemRow';
import LiteratureShareSheet from '@/components/LiteratureShareSheet';
import ProductPicker from '@/components/ProductPicker';
import SignatureCaptureModal from '@/components/SignatureCaptureModal';
import { Text, View, useSurfaceColors } from '@/components/Themed';
import { formStyles } from '@/constants/Form';
import { fonts } from '@/constants/Typography';
import { calcQuoteTotals } from '@/lib/calc';
import {
  addQuoteNoteEntry,
  getBusinessSettings,
  getQuoteNoteEntries,
  saveQuoteAsTemplate,
} from '@/lib/db';
import { captureException } from '@/lib/monitoring';
import { shareQuotePdf } from '@/lib/pdf';
import { formatCurrency } from '@/lib/products';
import {
  mapsUrlForAddress,
  normalizeFollowUpDate,
  normalizeValidUntil,
  telUrlForPhone,
  toDateInputValue,
} from '@/lib/quoteDocument';
import {
  clearQuoteFile,
  persistQuoteJobSitePhoto,
  persistQuoteSignature,
} from '@/lib/quoteMedia';
import {
  listQuoteLiterature,
  type QuoteLiteratureOption,
} from '@/lib/quoteLiterature';
import { formatQuoteDate, formatQuoteNumber } from '@/lib/quotes';
import type { SignatureDrawing } from '@/lib/signature';
import type {
  DiscountType,
  Product,
  QuoteNoteEntry,
  QuoteStatus,
} from '@/lib/types';
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS } from '@/lib/types';
import { useQuoteStore } from '@/store/quoteStore';

export default function QuoteBuilderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const quoteId = typeof id === 'string' ? id : '';

  const {
    tint,
    text: textColor,
    background,
    field: fieldBg,
    border: borderColor,
    surface: barBg,
    navy,
  } = useSurfaceColors();

  const stickyOffset = useSharedValue(28);
  useEffect(() => {
    stickyOffset.value = withTiming(0, { duration: 280 });
  }, [stickyOffset]);
  const stickyAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: stickyOffset.value }],
  }));

  const quote = useQuoteStore((s) => s.quote);
  const items = useQuoteStore((s) => s.items);
  const loading = useQuoteStore((s) => s.loading);
  const saving = useQuoteStore((s) => s.saving);
  const loadError = useQuoteStore((s) => s.loadError);
  const loadQuote = useQuoteStore((s) => s.loadQuote);
  const updateQuoteFields = useQuoteStore((s) => s.updateQuoteFields);
  const addProduct = useQuoteStore((s) => s.addProduct);
  const setItemQuantity = useQuoteStore((s) => s.setItemQuantity);
  const setItemPrice = useQuoteStore((s) => s.setItemPrice);
  const removeItem = useQuoteStore((s) => s.removeItem);
  const flush = useQuoteStore((s) => s.flush);
  const reset = useQuoteStore((s) => s.reset);

  const [customerOpen, setCustomerOpen] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [discountText, setDiscountText] = useState('0');
  const [taxText, setTaxText] = useState('0');
  const [depositText, setDepositText] = useState('0');
  const [validUntilText, setValidUntilText] = useState('');
  const [followUpText, setFollowUpText] = useState('');
  const [timelineEntries, setTimelineEntries] = useState<QuoteNoteEntry[]>([]);
  const [timelineDraft, setTimelineDraft] = useState('');
  const [timelineBusy, setTimelineBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [literatureSheetOpen, setLiteratureSheetOpen] = useState(false);
  const [literatureOptions, setLiteratureOptions] = useState<
    QuoteLiteratureOption[]
  >([]);
  const [literatureLoading, setLiteratureLoading] = useState(false);
  const [signRole, setSignRole] = useState<'customer' | 'tech' | null>(null);
  const [signing, setSigning] = useState(false);
  const [reasonModal, setReasonModal] = useState<{
    status: 'won' | 'lost';
  } | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!quoteId) {
        router.back();
        return;
      }
      void loadQuote(quoteId);
      return () => {
        void flush();
      };
    }, [flush, loadQuote, quoteId, router])
  );

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        void flush();
      }
    });
    return () => sub.remove();
  }, [flush]);

  useEffect(() => {
    if (loadError) {
      router.back();
    }
  }, [loadError, router]);

  useEffect(() => {
    if (!quote) return;
    setDiscountText(String(quote.discount ?? 0));
    setTaxText(String(quote.taxRate ?? 0));
    setDepositText(String(quote.deposit ?? 0));
    setValidUntilText(quote.validUntil ?? '');
    setFollowUpText(quote.followUpDate ?? '');
  }, [
    quote?.id,
    quote?.discount,
    quote?.taxRate,
    quote?.deposit,
    quote?.validUntil,
    quote?.followUpDate,
  ]);

  const loadTimeline = useCallback(async () => {
    if (!quoteId) return;
    try {
      const rows = await getQuoteNoteEntries(quoteId);
      setTimelineEntries(rows);
    } catch {
      setTimelineEntries([]);
    }
  }, [quoteId]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  const totals = useMemo(() => {
    if (!quote) {
      return calcQuoteTotals({
        items: [],
        discount: 0,
        discountType: 'flat',
        taxRate: 0,
      });
    }
    return calcQuoteTotals({
      items,
      discount: quote.discount,
      discountType: quote.discountType ?? 'flat',
      taxRate: quote.taxRate,
    });
  }, [items, quote]);

  const handleSelectProduct = useCallback(
    async (product: Product) => {
      await addProduct(product);
      setPickerOpen(false);
    },
    [addProduct]
  );

  const openPreview = useCallback(async () => {
    if (!quote) return;
    // Commit local text fields that may not have blurred yet.
    const nextValid = normalizeValidUntil(validUntilText);
    const parsedDeposit = Number(depositText.trim());
    const deposit =
      Number.isFinite(parsedDeposit) && parsedDeposit >= 0
        ? Math.round(parsedDeposit * 100) / 100
        : quote.deposit ?? 0;
    updateQuoteFields({
      validUntil: nextValid,
      deposit,
    });
    setValidUntilText(nextValid ?? '');
    setDepositText(String(deposit));
    await flush();
    router.push({ pathname: '/quote/preview/[id]', params: { id: quote.id } });
  }, [
    depositText,
    flush,
    quote,
    router,
    updateQuoteFields,
    validUntilText,
  ]);

  const finishShare = useCallback(
    async (literature: QuoteLiteratureOption[]) => {
      if (!quote) return;
      setSharing(true);
      try {
        await flush();
        const business = await getBusinessSettings();
        await shareQuotePdf(
          {
            quote: useQuoteStore.getState().quote ?? quote,
            items: useQuoteStore.getState().items,
            business,
          },
          { literature }
        );
        setLiteratureSheetOpen(false);
        // iOS share sheet resolves on dismiss (including cancel), so ask before
        // flipping status — do not infer that the PDF was actually sent.
        if (quote.status !== 'sent') {
          Alert.alert(
            'Mark as sent?',
            'Did you send this quote to the customer?',
            [
              { text: 'Not yet', style: 'cancel' },
              {
                text: 'Mark as sent',
                onPress: () => {
                  updateQuoteFields({ status: 'sent' });
                  void flush();
                },
              },
            ]
          );
        }
      } catch (err) {
        captureException(err, { action: 'share-pdf', quoteId: quote.id });
        const message =
          err instanceof Error ? err.message : 'Something went wrong.';
        Alert.alert(
          'Could not share PDF',
          `${message}\n\nQuotes and the catalog stay available offline. PDF share needs the device share sheet; try again when sharing is available.`
        );
      } finally {
        setSharing(false);
      }
    },
    [flush, quote, updateQuoteFields]
  );

  const handleSharePdf = useCallback(async () => {
    if (!quote || sharing) return;

    setSharing(true);
    setLiteratureLoading(true);
    try {
      await flush();
      const latestItems = useQuoteStore.getState().items;
      const options = await listQuoteLiterature(latestItems);
      if (options.length === 0) {
        await finishShare([]);
        return;
      }
      setLiteratureOptions(options);
      setLiteratureSheetOpen(true);
      setSharing(false);
    } catch (err) {
      captureException(err, { action: 'list-literature', quoteId: quote.id });
      // Still allow sharing the quote PDF alone.
      await finishShare([]);
    } finally {
      setLiteratureLoading(false);
    }
  }, [finishShare, flush, quote, sharing]);

  const callCustomer = useCallback(() => {
    const phone = quote?.phone.trim();
    if (!phone) return;
    void Linking.openURL(telUrlForPhone(phone)).catch(() => {
      Alert.alert('Could not place call', 'Check the phone number and try again.');
    });
  }, [quote?.phone]);

  const openMaps = useCallback(() => {
    const address = quote?.address.trim();
    if (!address) return;
    void Linking.openURL(mapsUrlForAddress(address)).catch(() => {
      Alert.alert('Could not open Maps', 'Check the address and try again.');
    });
  }, [quote?.address]);

  const commitDiscount = () => {
    const parsed = Number(discountText.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDiscountText(String(quote?.discount ?? 0));
      return;
    }
    const next = Math.round(parsed * 100) / 100;
    setDiscountText(String(next));
    updateQuoteFields({ discount: next });
    void flush();
  };

  const commitTax = () => {
    const parsed = Number(taxText.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      setTaxText(String(quote?.taxRate ?? 0));
      return;
    }
    const next = Math.round(parsed * 100) / 100;
    setTaxText(String(next));
    updateQuoteFields({ taxRate: next });
    void flush();
  };

  const commitDeposit = () => {
    const parsed = Number(depositText.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDepositText(String(quote?.deposit ?? 0));
      return;
    }
    const next = Math.round(parsed * 100) / 100;
    setDepositText(String(next));
    updateQuoteFields({ deposit: next });
    void flush();
  };

  const commitValidUntil = () => {
    const next = normalizeValidUntil(validUntilText);
    setValidUntilText(next ?? '');
    updateQuoteFields({ validUntil: next });
    void flush();
  };

  const commitFollowUp = () => {
    const next = normalizeFollowUpDate(followUpText);
    setFollowUpText(next ?? '');
    updateQuoteFields({ followUpDate: next });
    void flush();
  };

  const addTimelineNote = async () => {
    if (!quote || timelineBusy) return;
    const body = timelineDraft.trim();
    if (!body) return;
    setTimelineBusy(true);
    try {
      const entry = await addQuoteNoteEntry(quote.id, body);
      setTimelineEntries((current) => [entry, ...current]);
      setTimelineDraft('');
    } catch (err) {
      Alert.alert(
        'Could not add note',
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    } finally {
      setTimelineBusy(false);
    }
  };

  const handleSaveAsTemplate = () => {
    if (!quote) return;
    Alert.alert(
      'Save as template?',
      'Creates a reusable template with these line items and pricing (no customer).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save template',
          onPress: () => {
            void (async () => {
              try {
                await flush();
                const template = await saveQuoteAsTemplate(quote.id);
                Alert.alert(
                  'Template saved',
                  'Find it under the Templates filter on the Quotes tab.',
                  [
                    {
                      text: 'Open template',
                      onPress: () =>
                        router.replace({
                          pathname: '/quote/[id]',
                          params: { id: template.id },
                        }),
                    },
                    { text: 'OK' },
                  ]
                );
              } catch (err) {
                captureException(err, {
                  action: 'save-template',
                  quoteId: quote.id,
                });
                Alert.alert(
                  'Could not save template',
                  err instanceof Error ? err.message : 'Something went wrong.'
                );
              }
            })();
          },
        },
      ]
    );
  };

  const setDiscountType = (discountType: DiscountType) => {
    updateQuoteFields({ discountType });
    void flush();
  };

  const setDepositType = (depositType: DiscountType) => {
    updateQuoteFields({ depositType });
    void flush();
  };

  const setStatus = (status: QuoteStatus) => {
    if (status === 'won' || status === 'lost') {
      setReasonText(quote?.statusReason ?? '');
      setReasonModal({ status });
      return;
    }
    updateQuoteFields({ status, statusReason: '' });
    void flush();
  };

  const commitStatusReason = () => {
    if (!reasonModal) return;
    updateQuoteFields({
      status: reasonModal.status,
      statusReason: reasonText.trim(),
    });
    setReasonModal(null);
    void flush();
  };

  const saveSignature = async (
    role: 'customer' | 'tech',
    drawing: SignatureDrawing
  ) => {
    if (!quote) return;
    setSigning(true);
    try {
      await flush();
      const uri = await persistQuoteSignature(quote.id, role, drawing);
      if (role === 'customer') {
        updateQuoteFields({
          customerSignatureUri: uri,
          signedAt: new Date().toISOString(),
        });
        await flush();
        setSignRole(null);
        if (quote.status !== 'won') {
          Alert.alert(
            'Mark as won?',
            'Customer signature saved. Mark this quote as won?',
            [
              { text: 'Not yet', style: 'cancel' },
              {
                text: 'Mark as won',
                onPress: () => {
                  setReasonText(quote.statusReason || '');
                  setReasonModal({ status: 'won' });
                },
              },
            ]
          );
        }
      } else {
        updateQuoteFields({ techSignatureUri: uri });
        await flush();
        setSignRole(null);
      }
    } catch (err) {
      captureException(err, { action: 'save-signature', quoteId: quote.id, role });
      Alert.alert(
        'Could not save signature',
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    } finally {
      setSigning(false);
    }
  };

  const clearSignature = (role: 'customer' | 'tech') => {
    if (!quote) return;
    const uri =
      role === 'customer' ? quote.customerSignatureUri : quote.techSignatureUri;
    Alert.alert(
      'Clear signature?',
      role === 'customer'
        ? 'Remove the customer signature from this quote?'
        : 'Remove the tech signature from this quote?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await clearQuoteFile(uri);
              if (role === 'customer') {
                updateQuoteFields({
                  customerSignatureUri: null,
                  signedAt: null,
                });
              } else {
                updateQuoteFields({ techSignatureUri: null });
              }
              await flush();
            })();
          },
        },
      ]
    );
  };

  const pickJobSitePhoto = async (source: 'library' | 'camera') => {
    if (!quote || photoBusy) return;
    setPhotoBusy(true);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Camera permission needed',
            'Enable camera access in Settings, or use a rebuild that includes camera permission (see docs/BUILD.md).'
          );
          return;
        }
      } else {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Photos permission needed',
            'Allow photo library access to attach a job-site photo.'
          );
          return;
        }
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.8,
            });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      await flush();
      if (quote.jobSitePhotoUri) {
        await clearQuoteFile(quote.jobSitePhotoUri);
      }
      const uri = await persistQuoteJobSitePhoto(quote.id, result.assets[0].uri);
      updateQuoteFields({ jobSitePhotoUri: uri });
      await flush();
    } catch (err) {
      captureException(err, { action: 'job-site-photo', quoteId: quote.id });
      Alert.alert(
        'Could not add photo',
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  const clearJobSitePhoto = () => {
    if (!quote?.jobSitePhotoUri) return;
    Alert.alert('Remove job-site photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await clearQuoteFile(quote.jobSitePhotoUri);
            updateQuoteFields({ jobSitePhotoUri: null });
            await flush();
          })();
        },
      },
    ]);
  };

  if (loading || !quote) {
    return (
      <View style={[styles.centered, { backgroundColor: background }]}>
        <Stack.Screen options={{ title: 'Quote', headerBackTitle: 'Quotes' }} />
        <ActivityIndicator size="large" color={tint} />
      </View>
    );
  }

  const title = quote.isTemplate
    ? quote.notes.trim() || quote.customerName.trim() || 'Template'
    : quote.customerName.trim() || 'New Quote';
  const quoteRef = formatQuoteNumber(quote.quoteNumber);

  return (
    <KeyboardForm scroll={false} style={{ backgroundColor: background }}>
      <Stack.Screen
        options={{
          title,
          headerBackTitle: 'Quotes',
          headerRight: () =>
            saving ? (
              <Text style={[styles.saving, { color: tint }]}>Saving…</Text>
            ) : null,
        }}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 220 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Text style={styles.quoteRef}>
          {quoteRef ? `Quote ${quoteRef} · ` : ''}
          {formatQuoteDate(quote.createdAt)}
        </Text>

        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusRow} lightColor="transparent" darkColor="transparent">
          {QUOTE_STATUSES.map((status) => {
            const selected = quote.status === status;
            return (
              <Pressable
                key={status}
                onPress={() => setStatus(status)}
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
                  {QUOTE_STATUS_LABELS[status]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {(quote.status === 'won' || quote.status === 'lost') &&
        quote.statusReason.trim() ? (
          <Text style={styles.reasonLine}>
            {quote.status === 'won' ? 'Won' : 'Lost'} reason:{' '}
            {quote.statusReason.trim()}
          </Text>
        ) : null}

        <View
          style={[styles.acceptanceBlock, { borderColor, backgroundColor: fieldBg }]}>
          <Text style={styles.sectionTitle}>Acceptance</Text>
          <Text style={styles.notesHint}>
            Customer signature embeds on the PDF. Optional tech signature and
            job-site photo too.
          </Text>

          <View style={styles.acceptanceRow} lightColor="transparent" darkColor="transparent">
            <Text style={styles.acceptanceLabel}>
              Customer{quote.customerSignatureUri ? ' · signed' : ''}
            </Text>
            <View style={styles.acceptanceActions} lightColor="transparent" darkColor="transparent">
              <Pressable
                onPress={() => setSignRole('customer')}
                style={({ pressed }) => [
                  styles.miniBtn,
                  { borderColor: tint },
                  pressed && formStyles.pressed,
                ]}>
                <Text style={[styles.miniBtnText, { color: tint }]}>
                  {quote.customerSignatureUri ? 'Re-sign' : 'Capture'}
                </Text>
              </Pressable>
              {quote.customerSignatureUri ? (
                <Pressable onPress={() => clearSignature('customer')}>
                  <Text style={styles.removeAttachText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.acceptanceRow} lightColor="transparent" darkColor="transparent">
            <Text style={styles.acceptanceLabel}>
              Tech{quote.techSignatureUri ? ' · signed' : ''}
            </Text>
            <View style={styles.acceptanceActions} lightColor="transparent" darkColor="transparent">
              <Pressable
                onPress={() => setSignRole('tech')}
                style={({ pressed }) => [
                  styles.miniBtn,
                  { borderColor: tint },
                  pressed && formStyles.pressed,
                ]}>
                <Text style={[styles.miniBtnText, { color: tint }]}>
                  {quote.techSignatureUri ? 'Re-sign' : 'Capture'}
                </Text>
              </Pressable>
              {quote.techSignatureUri ? (
                <Pressable onPress={() => clearSignature('tech')}>
                  <Text style={styles.removeAttachText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.acceptanceRow} lightColor="transparent" darkColor="transparent">
            <Text style={styles.acceptanceLabel}>Job-site photo</Text>
            <View style={styles.acceptanceActions} lightColor="transparent" darkColor="transparent">
              <Pressable
                disabled={photoBusy}
                onPress={() => {
                  void pickJobSitePhoto('library');
                }}
                style={({ pressed }) => [
                  styles.miniBtn,
                  { borderColor: tint },
                  pressed && formStyles.pressed,
                ]}>
                <Text style={[styles.miniBtnText, { color: tint }]}>Library</Text>
              </Pressable>
              <Pressable
                disabled={photoBusy}
                onPress={() => {
                  void pickJobSitePhoto('camera');
                }}
                style={({ pressed }) => [
                  styles.miniBtn,
                  { borderColor: tint },
                  pressed && formStyles.pressed,
                ]}>
                <Text style={[styles.miniBtnText, { color: tint }]}>Camera</Text>
              </Pressable>
              {quote.jobSitePhotoUri ? (
                <Pressable onPress={clearJobSitePhoto}>
                  <Text style={styles.removeAttachText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          {quote.jobSitePhotoUri ? (
            <Image
              source={{ uri: quote.jobSitePhotoUri }}
              style={styles.jobPhoto}
              resizeMode="cover"
            />
          ) : null}
        </View>

        <Pressable
          onPress={() => setCustomerOpen((open) => !open)}
          style={[styles.sectionHeader, { borderColor }]}>
          <View style={styles.sectionHeaderText} lightColor="transparent" darkColor="transparent">
            <Text style={styles.sectionTitle}>Customer</Text>
            <Text style={styles.sectionHint} numberOfLines={1}>
              {quote.customerName.trim() || 'Add customer details'}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: tint }]}>
            {customerOpen ? 'Hide' : 'Show'}
          </Text>
        </Pressable>

        {customerOpen ? (
          <View style={styles.fields}>
            <FieldLabel>Name</FieldLabel>
            <TextInput
              value={quote.customerName}
              onChangeText={(customerName) => updateQuoteFields({ customerName })}
              onBlur={() => {
                void flush();
              }}
              placeholder="Customer name"
              placeholderTextColor="#999"
              style={[
                formStyles.input,
                { color: textColor, backgroundColor: fieldBg, borderColor },
              ]}
              autoCapitalize="words"
            />

            <FieldLabel>Phone</FieldLabel>
            <View style={styles.actionField} lightColor="transparent" darkColor="transparent">
              <TextInput
                value={quote.phone}
                onChangeText={(phone) => updateQuoteFields({ phone })}
                onBlur={() => {
                  void flush();
                }}
                placeholder="Phone"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                style={[
                  formStyles.input,
                  styles.actionFieldInput,
                  { color: textColor, backgroundColor: fieldBg, borderColor },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Call customer"
                disabled={!quote.phone.trim()}
                onPress={callCustomer}
                style={({ pressed }) => [
                  styles.actionChip,
                  {
                    borderColor: quote.phone.trim() ? tint : borderColor,
                    backgroundColor: quote.phone.trim() ? tint : fieldBg,
                    opacity: quote.phone.trim() ? 1 : 0.45,
                  },
                  pressed && formStyles.pressed,
                ]}>
                <Text
                  style={styles.actionChipText}
                  lightColor={quote.phone.trim() ? '#fff' : '#111'}
                  darkColor={quote.phone.trim() ? '#000' : '#fff'}>
                  Call
                </Text>
              </Pressable>
            </View>

            <FieldLabel>Email</FieldLabel>
            <TextInput
              value={quote.email}
              onChangeText={(email) => updateQuoteFields({ email })}
              onBlur={() => {
                void flush();
              }}
              placeholder="Email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                formStyles.input,
                { color: textColor, backgroundColor: fieldBg, borderColor },
              ]}
            />

            <FieldLabel>Address</FieldLabel>
            <TextInput
              value={quote.address}
              onChangeText={(address) => updateQuoteFields({ address })}
              onBlur={() => {
                void flush();
              }}
              placeholder="Service address"
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
              style={[
                formStyles.input,
                formStyles.multiline,
                { color: textColor, backgroundColor: fieldBg, borderColor },
              ]}
            />
            {quote.address.trim() ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open address in Maps"
                onPress={openMaps}
                style={({ pressed }) => [
                  styles.mapsLink,
                  pressed && formStyles.pressed,
                ]}>
                <Text style={[styles.mapsLinkText, { color: tint }]}>
                  Open in Maps
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.itemsHeader} lightColor="transparent" darkColor="transparent">
          <Text style={styles.sectionTitle}>Line items</Text>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: tint },
              pressed && formStyles.pressed,
            ]}>
            <Text style={styles.addButtonText} lightColor="#fff" darkColor="#000">
              Add Product
            </Text>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View
            style={[styles.emptyItems, { backgroundColor: fieldBg, borderColor }]}>
            <Text style={styles.emptyItemsText}>
              No products yet. Tap Add Product to build this quote.
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <LineItemRow
              key={item.id}
              item={item}
              onQuantityChange={(quantity) => {
                void setItemQuantity(item.id, quantity);
              }}
              onPriceChange={(price) => {
                void setItemPrice(item.id, price);
              }}
              onRemove={() => {
                void removeItem(item.id);
              }}
            />
          ))
        )}

        <View style={[styles.adjustments, { borderColor, backgroundColor: fieldBg }]}>
          <Text style={styles.sectionTitle}>Adjustments</Text>

          <FieldLabel>Discount</FieldLabel>
          <View style={styles.discountRow} lightColor="transparent" darkColor="transparent">
            <View style={styles.typeToggle} lightColor="transparent" darkColor="transparent">
              {(['flat', 'percent'] as DiscountType[]).map((type) => {
                const selected = (quote.discountType ?? 'flat') === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setDiscountType(type)}
                    style={[
                      styles.typeChip,
                      {
                        borderColor: selected ? tint : borderColor,
                        backgroundColor: selected ? tint : background,
                      },
                    ]}>
                    <Text
                      style={styles.typeChipText}
                      lightColor={selected ? '#fff' : '#111'}
                      darkColor={selected ? '#000' : '#fff'}>
                      {type === 'flat' ? '$' : '%'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={discountText}
              onChangeText={setDiscountText}
              onBlur={commitDiscount}
              onSubmitEditing={commitDiscount}
              keyboardType="decimal-pad"
              style={[
                formStyles.input,
                styles.discountInput,
                { color: textColor, backgroundColor: background, borderColor },
              ]}
            />
          </View>

          <FieldLabel>Tax rate (%)</FieldLabel>
          <TextInput
            value={taxText}
            onChangeText={setTaxText}
            onBlur={commitTax}
            onSubmitEditing={commitTax}
            keyboardType="decimal-pad"
            style={[
              formStyles.input,
              { color: textColor, backgroundColor: background, borderColor },
            ]}
          />
        </View>

        <View style={[styles.adjustments, { borderColor, backgroundColor: fieldBg }]}>
          <Text style={styles.sectionTitle}>Document</Text>
          <Text style={styles.notesHint}>
            Valid until appears in the PDF summary. Deposit and terms show below totals.
          </Text>

          <FieldLabel>Valid until (YYYY-MM-DD)</FieldLabel>
          <TextInput
            value={validUntilText}
            onChangeText={setValidUntilText}
            onBlur={commitValidUntil}
            onSubmitEditing={commitValidUntil}
            placeholder="2026-08-01"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              formStyles.input,
              { color: textColor, backgroundColor: background, borderColor },
            ]}
          />

          <FieldLabel>Deposit</FieldLabel>
          <View style={styles.discountRow} lightColor="transparent" darkColor="transparent">
            <View style={styles.typeToggle} lightColor="transparent" darkColor="transparent">
              {(['flat', 'percent'] as DiscountType[]).map((type) => {
                const selected = (quote.depositType ?? 'percent') === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setDepositType(type)}
                    style={[
                      styles.typeChip,
                      {
                        borderColor: selected ? tint : borderColor,
                        backgroundColor: selected ? tint : background,
                      },
                    ]}>
                    <Text
                      style={styles.typeChipText}
                      lightColor={selected ? '#fff' : '#111'}
                      darkColor={selected ? '#000' : '#fff'}>
                      {type === 'flat' ? '$' : '%'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={depositText}
              onChangeText={setDepositText}
              onBlur={commitDeposit}
              onSubmitEditing={commitDeposit}
              keyboardType="decimal-pad"
              style={[
                formStyles.input,
                styles.discountInput,
                { color: textColor, backgroundColor: background, borderColor },
              ]}
            />
          </View>

          <FieldLabel>Payment terms</FieldLabel>
          <TextInput
            value={quote.paymentTerms}
            onChangeText={(paymentTerms) => updateQuoteFields({ paymentTerms })}
            onBlur={() => {
              void flush();
            }}
            placeholder="50% to schedule, balance on completion"
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
            style={[
              formStyles.input,
              styles.termsInput,
              { color: textColor, backgroundColor: background, borderColor },
            ]}
          />

          <FieldLabel>Follow-up date (YYYY-MM-DD)</FieldLabel>
          <TextInput
            value={followUpText}
            onChangeText={setFollowUpText}
            onBlur={commitFollowUp}
            onSubmitEditing={commitFollowUp}
            placeholder={toDateInputValue(new Date())}
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              formStyles.input,
              { color: textColor, backgroundColor: background, borderColor },
            ]}
          />
          <Text style={styles.notesHint}>
            Badge-only reminders on the Quotes list (Due today / Needs
            follow-up). Local notifications would need a native rebuild later.
          </Text>
          {!quote.isTemplate ? (
            <Pressable
              onPress={handleSaveAsTemplate}
              style={({ pressed }) => [
                styles.miniBtn,
                { borderColor: tint, alignSelf: 'flex-start', marginTop: 4 },
                pressed && formStyles.pressed,
              ]}>
              <Text style={[styles.miniBtnText, { color: tint }]}>
                Save as template
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.notesHint, { color: tint }]}>
              This is a template. Use “New quote from template” on the Quotes
              tab to start a customer quote.
            </Text>
          )}
        </View>

        <View style={styles.notesBlock} lightColor="transparent" darkColor="transparent">
          <Text style={styles.sectionTitle}>PDF notes</Text>
          <Text style={styles.notesHint}>
            Shown on the quote PDF, above your terms.
          </Text>
          <TextInput
            value={quote.notes}
            onChangeText={(notes) => updateQuoteFields({ notes })}
            onBlur={() => {
              void flush();
            }}
            placeholder="Scope, access notes, exclusions…"
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
            style={[
              formStyles.input,
              styles.notesInput,
              { color: textColor, backgroundColor: fieldBg, borderColor },
            ]}
          />
        </View>

        <View style={styles.notesBlock} lightColor="transparent" darkColor="transparent">
          <Text style={styles.sectionTitle}>Activity timeline</Text>
          <Text style={styles.notesHint}>
            Append-only internal notes (not printed on the PDF).
          </Text>
          <TextInput
            value={timelineDraft}
            onChangeText={setTimelineDraft}
            placeholder="Called customer, left voicemail…"
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
            style={[
              formStyles.input,
              styles.timelineInput,
              { color: textColor, backgroundColor: fieldBg, borderColor },
            ]}
          />
          <Pressable
            disabled={timelineBusy || !timelineDraft.trim()}
            onPress={() => {
              void addTimelineNote();
            }}
            style={({ pressed }) => [
              styles.miniBtn,
              {
                borderColor: tint,
                alignSelf: 'flex-start',
                opacity: timelineBusy || !timelineDraft.trim() ? 0.45 : 1,
              },
              pressed && formStyles.pressed,
            ]}>
            <Text style={[styles.miniBtnText, { color: tint }]}>
              {timelineBusy ? 'Adding…' : 'Add note'}
            </Text>
          </Pressable>
          {timelineEntries.length === 0 ? (
            <Text style={styles.emptyTimeline}>No activity notes yet.</Text>
          ) : (
            timelineEntries.map((entry) => (
              <View
                key={entry.id}
                style={[
                  styles.timelineRow,
                  { backgroundColor: fieldBg, borderColor },
                ]}>
                <Text style={styles.timelineWhen}>
                  {formatQuoteDate(entry.createdAt)}
                </Text>
                <Text style={styles.timelineBody}>{entry.body}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Animated.View
        style={[
          styles.stickyBar,
          stickyAnimStyle,
          {
            backgroundColor: barBg,
            borderColor,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}>
        <TotalsRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
        <TotalsRow
          label={`Discount (${quote.discountType === 'percent' ? '%' : '$'})`}
          value={`−${formatCurrency(totals.discountAmount)}`}
        />
        <TotalsRow label="Tax" value={formatCurrency(totals.tax)} />
        <View style={styles.grandRow} lightColor="transparent" darkColor="transparent">
          <Text style={[styles.grandLabel, { color: navy }]}>Total</Text>
          <Text style={[styles.grandValue, { color: tint }]}>
            {formatCurrency(totals.grandTotal)}
          </Text>
        </View>
        <View style={styles.actionRow} lightColor="transparent" darkColor="transparent">
          <SecondaryButton
            label="Preview"
            onPress={() => {
              void openPreview();
            }}
            style={styles.secondaryBarButton}
          />
          <PrimaryButton
            label={sharing || literatureLoading ? 'Preparing…' : 'Share PDF'}
            onPress={() => {
              void handleSharePdf();
            }}
            disabled={sharing || literatureLoading}
            style={styles.shareButtonFlex}
          />
        </View>
      </Animated.View>

      <ProductPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(product) => {
          void handleSelectProduct(product);
        }}
      />

      <LiteratureShareSheet
        visible={literatureSheetOpen}
        options={literatureOptions}
        loading={literatureLoading}
        confirming={sharing}
        onClose={() => {
          if (sharing) return;
          setLiteratureSheetOpen(false);
        }}
        onConfirm={(selected) => {
          void finishShare(selected);
        }}
      />

      <SignatureCaptureModal
        visible={signRole !== null}
        title={signRole === 'tech' ? 'Tech signature' : 'Customer signature'}
        confirming={signing}
        onClose={() => {
          if (signing) return;
          setSignRole(null);
        }}
        onSave={(drawing) => {
          if (!signRole) return;
          void saveSignature(signRole, drawing);
        }}
      />

      <Modal
        visible={reasonModal !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setReasonModal(null)}>
        <RNView style={styles.reasonBackdrop}>
          <View style={[styles.reasonCard, { backgroundColor: background, borderColor }]}>
            <Text style={styles.sheetTitle}>
              {reasonModal?.status === 'won' ? 'Won reason' : 'Lost reason'}
            </Text>
            <Text style={styles.notesHint}>
              Optional — helps you remember why this deal closed.
            </Text>
            <TextInput
              value={reasonText}
              onChangeText={setReasonText}
              placeholder={
                reasonModal?.status === 'won'
                  ? 'e.g. Signed on site, deposit collected'
                  : 'e.g. Chose competitor, budget'
              }
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
              style={[
                formStyles.input,
                styles.reasonInput,
                { color: textColor, backgroundColor: fieldBg, borderColor },
              ]}
            />
            <View style={styles.reasonActions} lightColor="transparent" darkColor="transparent">
              <Pressable
                onPress={() => setReasonModal(null)}
                style={({ pressed }) => [
                  styles.miniBtn,
                  { borderColor },
                  pressed && formStyles.pressed,
                ]}>
                <Text style={styles.miniBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={commitStatusReason}
                style={({ pressed }) => [
                  formStyles.primaryButton,
                  styles.reasonSave,
                  { backgroundColor: tint },
                  pressed && formStyles.pressed,
                ]}>
                <Text style={formStyles.primaryButtonText} lightColor="#fff" darkColor="#000">
                  Save status
                </Text>
              </Pressable>
            </View>
          </View>
        </RNView>
      </Modal>
    </KeyboardForm>
  );
}

function TotalsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totalRow} lightColor="transparent" darkColor="transparent">
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  reasonLine: {
    fontSize: 13,
    opacity: 0.65,
    marginBottom: 10,
    lineHeight: 18,
  },
  acceptanceBlock: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 8,
  },
  acceptanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  acceptanceLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  acceptanceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    minHeight: 34,
    justifyContent: 'center',
  },
  miniBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  removeAttachText: {
    color: '#d11a2a',
    fontSize: 13,
    fontWeight: '600',
  },
  jobPhoto: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginTop: 4,
  },
  reasonBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  reasonCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  reasonInput: {
    minHeight: 90,
    paddingTop: 12,
  },
  reasonActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  reasonSave: {
    marginTop: 0,
    flex: 1,
    minHeight: 44,
  },
  sectionHeader: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  sectionHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    opacity: 0.55,
  },
  chevron: {
    fontSize: 14,
    fontWeight: '600',
  },
  fields: {
    gap: 6,
    marginBottom: 8,
  },
  actionField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionFieldInput: {
    flex: 1,
  },
  actionChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  actionChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  mapsLink: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  mapsLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  termsInput: {
    minHeight: 72,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  itemsHeader: {
    marginTop: 12,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyItems: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 18,
  },
  emptyItemsText: {
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 20,
  },
  adjustments: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  typeChip: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipText: {
    fontSize: 16,
    fontWeight: '700',
  },
  discountInput: {
    flex: 1,
  },
  quoteRef: {
    fontSize: 13,
    opacity: 0.55,
    marginBottom: 4,
  },
  notesBlock: {
    marginTop: 12,
    gap: 4,
  },
  notesHint: {
    fontSize: 13,
    opacity: 0.55,
    marginBottom: 4,
  },
  notesInput: {
    minHeight: 110,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  timelineInput: {
    minHeight: 72,
    paddingTop: 14,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  emptyTimeline: {
    fontSize: 13,
    opacity: 0.55,
    marginTop: 8,
  },
  timelineRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    gap: 4,
  },
  timelineWhen: {
    fontSize: 12,
    opacity: 0.55,
    fontWeight: '600',
  },
  timelineBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    opacity: 0.65,
  },
  totalValue: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  grandLabel: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  grandValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  actionRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBarButton: {
    flex: 1,
    marginTop: 0,
  },
  shareButtonFlex: {
    flex: 1.35,
    marginTop: 0,
  },
  saving: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
});
