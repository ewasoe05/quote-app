import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SignaturePad from '@/components/SignaturePad';
import { Text, View, useThemeColor } from '@/components/Themed';
import { formStyles } from '@/constants/Form';
import {
  isSignatureEmpty,
  type SignatureDrawing,
} from '@/lib/signature';

type SignatureCaptureModalProps = {
  visible: boolean;
  title: string;
  confirming?: boolean;
  onClose: () => void;
  onSave: (drawing: SignatureDrawing) => void;
};

export default function SignatureCaptureModal({
  visible,
  title,
  confirming = false,
  onClose,
  onSave,
}: SignatureCaptureModalProps) {
  const insets = useSafeAreaInsets();
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const drawingRef = useRef<SignatureDrawing | null>(null);
  const [hasInk, setHasInk] = useState(false);

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
          <View style={styles.header} lightColor="transparent" darkColor="transparent">
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} disabled={confirming}>
              <Text style={{ color: tint, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            Sign with your finger. This appears on the quote PDF.
          </Text>
          <SignaturePad
            height={180}
            onChange={(drawing) => {
              drawingRef.current = drawing;
              setHasInk(!isSignatureEmpty(drawing));
            }}
          />
          <Pressable
            disabled={!hasInk || confirming}
            onPress={() => {
              if (!drawingRef.current || isSignatureEmpty(drawingRef.current)) {
                return;
              }
              onSave(drawingRef.current);
            }}
            style={({ pressed }) => [
              formStyles.primaryButton,
              { backgroundColor: tint, opacity: !hasInk || confirming ? 0.5 : 1 },
              pressed && formStyles.pressed,
            ]}>
            <Text style={formStyles.primaryButtonText} lightColor="#fff" darkColor="#000">
              {confirming ? 'Saving…' : 'Save signature'}
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
  dismissArea: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    opacity: 0.6,
    lineHeight: 18,
  },
});
