import { useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  View as RNView,
} from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { formStyles } from '@/constants/Form';
import {
  isSignatureEmpty,
  type SignatureDrawing,
  type SignaturePoint,
  type SignatureStroke,
} from '@/lib/signature';

type SignaturePadProps = {
  height?: number;
  onChange?: (drawing: SignatureDrawing) => void;
};

/**
 * Gesture signature pad using PanResponder + point dots (no WebView/Skia).
 * Callers persist via SVG export helpers in lib/signature.ts.
 */
export default function SignaturePad({
  height = 160,
  onChange,
}: SignaturePadProps) {
  const borderColor = useThemeColor(
    { light: '#dde1e6', dark: 'rgba(255,255,255,0.12)' },
    'text'
  );
  const fieldBg = useThemeColor(
    { light: '#fafbfc', dark: 'rgba(255,255,255,0.06)' },
    'background'
  );
  const ink = useThemeColor({ light: '#111', dark: '#f2f2f2' }, 'text');

  const [size, setSize] = useState({ width: 1, height });
  const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
  const strokesRef = useRef<SignatureStroke[]>([]);
  const drawingRef = useRef(false);

  const emit = useCallback(
    (next: SignatureStroke[]) => {
      strokesRef.current = next;
      setStrokes(next);
      onChange?.({
        width: size.width,
        height: size.height,
        strokes: next,
      });
    },
    [onChange, size.height, size.width]
  );

  const clear = useCallback(() => {
    emit([]);
  }, [emit]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          drawingRef.current = true;
          const point: SignaturePoint = {
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
          };
          emit([...strokesRef.current, { points: [point] }]);
        },
        onPanResponderMove: (event) => {
          if (!drawingRef.current) return;
          const point: SignaturePoint = {
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
          };
          const current = strokesRef.current;
          if (current.length === 0) return;
          const next = current.slice(0, -1);
          const last = current[current.length - 1]!;
          const prev = last.points[last.points.length - 1];
          // Skip tiny jitter so SVG stays compact.
          if (
            prev &&
            Math.hypot(point.x - prev.x, point.y - prev.y) < 1.5
          ) {
            return;
          }
          next.push({ points: [...last.points, point] });
          emit(next);
        },
        onPanResponderRelease: () => {
          drawingRef.current = false;
        },
        onPanResponderTerminate: () => {
          drawingRef.current = false;
        },
      }),
    [emit]
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height: layoutHeight } = event.nativeEvent.layout;
    setSize({ width, height: layoutHeight });
  };

  const empty = isSignatureEmpty({
    width: size.width,
    height: size.height,
    strokes,
  });

  return (
    <View style={styles.wrap} lightColor="transparent" darkColor="transparent">
      <RNView
        onLayout={onLayout}
        style={[
          styles.pad,
          { height, borderColor, backgroundColor: fieldBg },
        ]}
        {...panResponder.panHandlers}>
        {empty ? (
          <Text style={styles.placeholder}>Sign here</Text>
        ) : null}
        {strokes.flatMap((stroke, strokeIndex) =>
          stroke.points.map((point, pointIndex) => (
            <RNView
              key={`${strokeIndex}-${pointIndex}`}
              pointerEvents="none"
              style={[
                styles.dot,
                {
                  left: point.x - 1.75,
                  top: point.y - 1.75,
                  backgroundColor: ink,
                },
              ]}
            />
          ))
        )}
      </RNView>
      <Pressable
        onPress={clear}
        disabled={empty}
        style={({ pressed }) => [
          styles.clearBtn,
          { borderColor, opacity: empty ? 0.4 : 1 },
          pressed && formStyles.pressed,
        ]}>
        <Text style={styles.clearText}>Clear</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  pad: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  placeholder: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '42%',
    textAlign: 'center',
    opacity: 0.35,
    fontSize: 15,
  },
  dot: {
    position: 'absolute',
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
  clearBtn: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 36,
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
