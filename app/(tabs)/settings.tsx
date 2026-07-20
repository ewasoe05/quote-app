import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';

import { Text, View, useThemeColor } from '@/components/Themed';
import {
  getBusinessSettings,
  saveBusinessSettings,
} from '@/lib/db';
import {
  clearPersistedBusinessLogo,
  persistBusinessLogo,
} from '@/lib/logo';
import type { BusinessSettings } from '@/lib/types';
import { DEFAULT_BUSINESS_SETTINGS } from '@/lib/types';

export default function SettingsScreen() {
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

  const [settings, setSettings] = useState<BusinessSettings>({
    ...DEFAULT_BUSINESS_SETTINGS,
  });
  const [taxText, setTaxText] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = await getBusinessSettings();
      setSettings(row);
      setTaxText(String(row.defaultTaxRate ?? 0));
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

    setSaving(true);
    try {
      const next: BusinessSettings = {
        ...settings,
        defaultTaxRate: Math.round(parsedTax * 100) / 100,
      };
      await saveBusinessSettings(next);
      setSettings(next);
      setTaxText(String(next.defaultTaxRate));
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
        'Allow photo library access to choose a company logo.'
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
      if (settings.logoUri && settings.logoUri !== uri) {
        await clearPersistedBusinessLogo(settings.logoUri);
      }
      updateField('logoUri', uri);
    } catch (err) {
      Alert.alert(
        'Logo failed',
        err instanceof Error ? err.message : 'Could not save the logo file.'
      );
    }
  };

  const handleRemoveLogo = async () => {
    await clearPersistedBusinessLogo(settings.logoUri);
    updateField('logoUri', null);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: background }]}>
        <ActivityIndicator size="large" color={tint} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Business info</Text>
        <Text style={styles.subheading}>
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
            <Pressable
              onPress={() => {
                void handlePickLogo();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor, backgroundColor: fieldBg },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.secondaryButtonText, { color: tint }]}>
                {settings.logoUri ? 'Change logo' : 'Choose logo'}
              </Text>
            </Pressable>
            {settings.logoUri ? (
              <Pressable onPress={() => void handleRemoveLogo()} hitSlop={6}>
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
            styles.input,
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
            styles.input,
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
            styles.input,
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
            styles.input,
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
            styles.input,
            styles.multiline,
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
            styles.input,
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
            styles.input,
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
            styles.input,
            styles.footerInput,
            { color: textColor, backgroundColor: fieldBg, borderColor },
          ]}
        />

        <Pressable
          onPress={() => {
            void handleSave();
          }}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: tint },
            (pressed || saving) && styles.pressed,
          ]}>
          <Text style={styles.saveButtonText} lightColor="#fff" darkColor="#000">
            {saving ? 'Saving…' : 'Save settings'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 6,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.65,
    marginBottom: 12,
  },
  label: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
  },
  multiline: {
    minHeight: 80,
    paddingTop: 12,
  },
  footerInput: {
    minHeight: 110,
    paddingTop: 12,
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
    fontSize: 11,
    opacity: 0.55,
  },
  logoActions: {
    gap: 8,
  },
  secondaryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  removeLogo: {
    color: '#d11a2a',
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
