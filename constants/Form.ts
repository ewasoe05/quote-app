import { Platform, StyleSheet } from 'react-native';

/** Shared form control sizes tuned for one-handed field use (≈44pt targets). */
export const formStyles = StyleSheet.create({
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
    minHeight: 48,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
  },
  multiline: {
    minHeight: 96,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  primaryButton: {
    marginTop: 20,
    borderRadius: 12,
    minHeight: 52,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 14,
    minHeight: 40,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
