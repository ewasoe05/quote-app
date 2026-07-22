import { Platform, StyleSheet } from 'react-native';

import { fonts } from './Typography';

/** Shared form control sizes tuned for one-handed field use (≈44pt targets). */
export const formStyles = StyleSheet.create({
  label: {
    marginTop: 10,
    marginBottom: 4,
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.72,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 48,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontFamily: fonts.regular,
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
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  /** Rounded-rect chips (not full pills). */
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 40,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.88,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    marginTop: 20,
    marginBottom: 4,
  },
  screenTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.65,
    marginBottom: 12,
  },
});
