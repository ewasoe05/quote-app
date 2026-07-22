import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';

import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import FieldLabel from '@/components/FieldLabel';
import KeyboardForm from '@/components/KeyboardForm';
import { Text, View, useSurfaceColors } from '@/components/Themed';
import { formStyles } from '@/constants/Form';
import { fonts } from '@/constants/Typography';
import { exportBackup, importBackup } from '@/lib/backup';
import {
  getBusinessSettings,
  saveBusinessSettings,
} from '@/lib/db';
import {
  clearPersistedBusinessLogo,
  persistBusinessLogo,
} from '@/lib/logo';
import { captureException } from '@/lib/monitoring';
import type { BusinessSettings } from '@/lib/types';
import { DEFAULT_BUSINESS_SETTINGS } from '@/lib/types';

export default function SettingsScreen() {
  const {
    tint,
    text: textColor,
    background,
    field: fieldBg,
    border: borderColor,
    navy,
    muted,
  } = useSurfaceColors();

  const [settings, setSettings] = useState<BusinessSettings>({
    ...DEFAULT_BUSINESS_SETTINGS,
  });
  const [taxText, setTaxText] = useState('0');
  const [validDaysText, setValidDaysText] = useState('7');
  const [depositText, setDepositText] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = await getBusinessSettings();
      setSettings(row);
      setTaxText(String(row.defaultTaxRate ?? 0));
      setValidDaysText(String(row.defaultValidDays ?? 0));
      setDepositText(String(row.defaultDeposit ?? 0));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    setTaxText(String(settings.defaultTaxRate ?? 0));
  }, [settings.defaultTaxRate]);

  useEffect(() => {
    setValidDaysText(String(settings.defaultValidDays ?? 0));
  }, [settings.defaultValidDays]);

  useEffect(() => {
    setDepositText(String(settings.defaultDeposit ?? 0));
  }, [settings.defaultDeposit]);

  const updateField = <K extends keyof BusinessSettings>(
    key: K,
    value: BusinessSettings[K]
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    const parsedTax = Number(taxText.trim());
    if (!Number.isFinite(parsedTax) || parsedTax < 0) {
      Alert.alert('Invalid tax rate', 'Enter a tax rate of 0 or greater.');
      return;
    }
    const parsedDays = Number(validDaysText.trim());
    if (!Number.isFinite(parsedDays) || parsedDays < 0) {
      Alert.alert('Invalid valid-until days', 'Enter 0 or more days.');
      return;
    }
    const parsedDeposit = Number(depositText.trim());
    if (!Number.isFinite(parsedDeposit) || parsedDeposit < 0) {
      Alert.alert('Invalid deposit', 'Enter a deposit of 0 or greater.');
      return;
    }
    const accent = settings.accentColor.trim();
    if (!/^#([0-9a-fA-F]{6})$/.test(accent)) {
      Alert.alert('Invalid accent color', 'Use a hex color like #1F6FEB.');
      return;
    }

    setSaving(true);
    try {
      const next: BusinessSettings = {
        ...settings,
        defaultTaxRate: Math.round(parsedTax * 100) / 100,
        defaultValidDays: Math.max(0, Math.floor(parsedDays)),
        defaultDeposit: Math.round(parsedDeposit * 100) / 100,
        accentColor: accent,
      };
      await saveBusinessSettings(next);
      setSettings(next);
      setTaxText(String(next.defaultTaxRate));
      setValidDaysText(String(next.defaultValidDays));
      setDepositText(String(next.defaultDeposit));
      Alert.alert('Saved', 'Business settings will appear on quote PDFs.');
    } catch (err) {
      Alert.alert(
        'Save failed',
        err instanceof Error ? err.message : 'Could not save settings.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Allow photo library access to choose a company logo.',
        permission.canAskAgain
          ? [{ text: 'OK' }]
          : [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  void Linking.openSettings();
                },
              },
            ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    try {
      const uri = await persistBusinessLogo(result.assets[0].uri);
      const previousLogo = settings.logoUri;
      const next: BusinessSettings = { ...settings, logoUri: uri };
      // Persist immediately so the logo survives leaving Settings without tapping Save.
      await saveBusinessSettings(next);
      if (previousLogo && previousLogo !== uri) {
        await clearPersistedBusinessLogo(previousLogo);
      }
      setSettings(next);
    } catch (err) {
      Alert.alert(
        'Logo failed',
        err instanceof Error ? err.message : 'Could not save the logo file.'
      );
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const previousLogo = settings.logoUri;
      const next: BusinessSettings = { ...settings, logoUri: null };
      await saveBusinessSettings(next);
      await clearPersistedBusinessLogo(previousLogo);
      setSettings(next);
    } catch (err) {
      Alert.alert(
        'Remove failed',
        err instanceof Error ? err.message : 'Could not remove the logo.'
      );
    }
  };

  const handleExportBackup = async () => {
    setBackupBusy(true);
    try {
      await exportBackup();
    } catch (err) {
      captureException(err, { stage: 'backup-export' });
      Alert.alert(
        'Export failed',
        err instanceof Error ? err.message : 'Could not create a backup.'
      );
    } finally {
      setBackupBusy(false);
    }
  };

  const runImportBackup = async () => {
    setBackupBusy(true);
    try {
      const result = await importBackup();
      if (!result) return;
      await load();
      Alert.alert(
        'Backup restored',
        'Quotes, catalog, and media were replaced. Reopen any quote you had open.'
      );
    } catch (err) {
      Alert.alert(
        'Import failed',
        err instanceof Error ? err.message : 'Could not restore that backup.'
      );
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportBackup = () => {
    Alert.alert(
      'Replace all data?',
      'Importing a backup overwrites quotes, products, settings, and media on this phone. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import backup',
          style: 'destructive',
          onPress: () => {
            void runImportBackup();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: background }]}>
        <ActivityIndicator size="large" color={tint} />
      </View>
    );
  }

  return (
    <KeyboardForm style={{ backgroundColor: background }}>
      <Text style={[formStyles.screenTitle, { color: navy }]}>Business info</Text>
      <Text style={[formStyles.screenSubtitle, { color: muted }]}>
        Shown on every quote PDF. Default tax rate applies to new quotes.
      </Text>

      <FieldLabel>Logo</FieldLabel>
      <View style={styles.logoRow} lightColor="transparent" darkColor="transparent">
        {settings.logoUri ? (
          <Image source={{ uri: settings.logoUri }} style={styles.logo} />
        ) : (
          <View
            style={[
              styles.logoPlaceholder,
              { backgroundColor: fieldBg, borderColor },
            ]}>
            <Text style={styles.logoPlaceholderText}>No logo</Text>
          </View>
        )}
        <View style={styles.logoActions} lightColor="transparent" darkColor="transparent">
          <SecondaryButton
            label={settings.logoUri ? 'Change logo' : 'Choose logo'}
            onPress={() => {
              void handlePickLogo();
            }}
          />
          {settings.logoUri ? (
            <Pressable onPress={() => void handleRemoveLogo()} hitSlop={12}>
              <Text style={styles.removeLogo}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <FieldLabel>Business name</FieldLabel>
      <TextInput
        value={settings.businessName}
        onChangeText={(businessName) => updateField('businessName', businessName)}
        placeholder="Company name"
        placeholderTextColor="#999"
        style={[
          formStyles.input,
          { color: textColor, backgroundColor: fieldBg, borderColor },
        ]}
      />

      <FieldLabel>Phone</FieldLabel>
      <TextInput
        value={settings.phone}
        onChangeText={(phone) => updateField('phone', phone)}
        placeholder="Business phone"
        placeholderTextColor="#999"
        keyboardType="phone-pad"
        style={[
          formStyles.input,
          { color: textColor, backgroundColor: fieldBg, borderColor },
        ]}
      />

      <FieldLabel>Email</FieldLabel>
      <TextInput
        value={settings.email}
        onChangeText={(email) => updateField('email', email)}
        placeholder="quotes@company.com"
        placeholderTextColor="#999"
        keyboardType="email-address"
        autoCapitalize="none"
        style={[
          formStyles.input,
          { color: textColor, backgroundColor: fieldBg, borderColor },
        ]}
      />

      <FieldLabel>Website</FieldLabel>
      <TextInput
        value={settings.website}
        onChangeText={(website) => updateField('website', website)}
        placeholder="https://"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="url"
        style={[
          formStyles.input,
          { color: textColor, backgroundColor: fieldBg, borderColor },
        ]}
      />

      <FieldLabel>Address</FieldLabel>
      <TextInput
        value={settings.address}
        onChangeText={(address) => updateField('address', address)}
        placeholder="Street, city, state, ZIP"
        placeholderTextColor="#999"
        multiline
        textAlignVertical="top"
        style={[
          formStyles.input,
          formStyles.multiline,
          { color: textColor, backgroundColor: fieldBg, borderColor },
        ]}
      />

      <FieldLabel>License #</FieldLabel>
      <TextInput
        value={settings.licenseNumber}
        onChangeText={(licenseNumber) =>
          updateField('licenseNumber', licenseNumber)
        }
        placeholder="Contractor / business license"
        placeholderTextColor="#999"
        style={[
          formStyles.input,
          { color: textColor, backgroundColor: fieldBg, borderColor },
        ]}
      />

      <FieldLabel>Default tax rate (%)</FieldLabel>
      <TextInput
        value={taxText}
        onChangeText={setTaxText}
        placeholder="0"
        placeholderTextColor="#999"
        keyboardType="decimal-pad"
        style={[
          formStyles.input,
          { color: textColor, backgroundColor: fieldBg, borderColor },
        ]}
      />

      <FieldLabel>Default valid-until (days)</FieldLabel>
      <TextInput
        value={validDaysText}
        onChangeText={setValidDaysText}
        placeholder="7"
        placeholderTextColor="#999"
        keyboardType="number-pad"
        style={[
          formStyles.input,
          { color: textColor, backgroundColor: fieldBg, borderColor },
        ]}
      />
      <Text style={styles.fieldHint}>
        New quotes get this many days from today. Use 0 to leave blank.
      </Text>

      <FieldLabel>Default deposit</FieldLabel>
      <View style={styles.depositRow} lightColor="transparent" darkColor="transparent">
        <View style={styles.typeToggle} lightColor="transparent" darkColor="transparent">
          {(['flat', 'percent'] as const).map((type) => {
            const selected = settings.defaultDepositType === type;
            return (
              <Pressable
                key={type}
                onPress={() => updateField('defaultDepositType', type)}
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
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
          style={[
            formStyles.input,
            styles.depositInput,
            { color: textColor, backgroundColor: fieldBg, borderColor },
          ]}
        />
      </View>

      <FieldLabel>Default payment terms</FieldLabel>
      <TextInput
        value={settings.defaultPaymentTerms}
        onChangeText={(defaultPaymentTerms) =>
          updateField('defaultPaymentTerms', defaultPaymentTerms)
        }
        placeholder="50% to schedule, balance on completion"
        placeholderTextColor="#999"
        multiline
        textAlignVertical="top"
        style={[
          formStyles.input,
          styles.termsInput,
          { color: textColor, backgroundColor: fieldBg, borderColor },
        ]}
      />

      <FieldLabel>PDF accent color</FieldLabel>
      <TextInput
        value={settings.accentColor}
        onChangeText={(accentColor) => updateField('accentColor', accentColor)}
        placeholder="#1F6FEB"
        placeholderTextColor="#999"
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          formStyles.input,
          { color: textColor, backgroundColor: fieldBg, borderColor },
        ]}
      />

      <FieldLabel>Quote footer (warranty / terms)</FieldLabel>
      <TextInput
        value={settings.quoteFooter}
        onChangeText={(quoteFooter) => updateField('quoteFooter', quoteFooter)}
        placeholder="Warranty, terms, and thank-you text for PDFs"
        placeholderTextColor="#999"
        multiline
        textAlignVertical="top"
        style={[
          formStyles.input,
          styles.footerInput,
          { color: textColor, backgroundColor: fieldBg, borderColor },
        ]}
      />

      <PrimaryButton
        label={saving ? 'Saving…' : 'Save settings'}
        onPress={() => {
          void handleSave();
        }}
        disabled={saving || backupBusy}
      />

      <Text style={[formStyles.screenTitle, styles.backupHeading, { color: navy }]}>
        Backup
      </Text>
      <Text style={[formStyles.screenSubtitle, { color: muted }]}>
        Export a zip of your database and media to Files or iCloud. Import
        replaces everything on this phone. Sync across devices is not included.
      </Text>
      <SecondaryButton
        label={backupBusy ? 'Working…' : 'Export backup'}
        onPress={() => {
          void handleExportBackup();
        }}
        disabled={backupBusy}
        style={styles.backupButton}
      />
      <SecondaryButton
        label="Import backup"
        onPress={handleImportBackup}
        disabled={backupBusy}
        style={styles.backupButton}
      />
    </KeyboardForm>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupHeading: {
    marginTop: 28,
    fontSize: 20,
  },
  backupButton: {
    marginTop: 0,
    marginBottom: 10,
    alignSelf: 'stretch',
  },
  footerInput: {
    minHeight: 110,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  termsInput: {
    minHeight: 72,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  fieldHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    opacity: 0.55,
    marginBottom: 8,
    marginTop: -4,
  },
  depositRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
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
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  depositInput: {
    flex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  logoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    opacity: 0.55,
  },
  logoActions: {
    gap: 8,
    flex: 1,
  },
  removeLogo: {
    color: '#d11a2a',
    fontFamily: fonts.semibold,
    fontSize: 13,
    paddingVertical: 6,
  },
});
