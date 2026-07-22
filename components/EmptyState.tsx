import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { Text, View, useSurfaceColors } from '@/components/Themed';
import { fonts } from '@/constants/Typography';

type Props = {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  children?: ReactNode;
};

export default function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  actionDisabled,
  children,
}: Props) {
  const { muted, navy } = useSurfaceColors();

  return (
    <View style={styles.wrap} lightColor="transparent" darkColor="transparent">
      <Text style={[styles.title, { color: navy }]}>{title}</Text>
      <Text style={[styles.body, { color: muted }]}>{body}</Text>
      {children}
      {actionLabel && onAction ? (
        <PrimaryButton
          label={actionLabel}
          onPress={onAction}
          disabled={actionDisabled}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  action: {
    alignSelf: 'stretch',
    marginTop: 16,
  },
});
