import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { tick } from '@/components/stepper';
import { useColors } from '@/theme';

const W = 50;
const H = 30;
const THUMB = 24;
const PAD = (H - THUMB) / 2;

/**
 * On/off switch in the app's style: the track fades from grey to lime and the thumb slides
 * across. Replaces the system Switch, whose Android animation flashes white.
 */
export function Toggle({
  value,
  onValueChange,
  disabled = false,
  label,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  const c = useColors();
  const on = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(value ? 1 : 0, { duration: 180 });
  }, [value, on]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [c.surface2, c.accent]),
    borderColor: interpolateColor(on.value, [0, 1], [c.border, c.accent]),
  }));
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: on.value * (W - THUMB - PAD * 2 - 2) }],
    backgroundColor: interpolateColor(on.value, [0, 1], [c.textDim, c.onAccent]),
  }));

  return (
    <Pressable
      onPress={() => {
        tick();
        onValueChange(!value);
      }}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      style={{ opacity: disabled ? 0.4 : 1 }}>
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.thumb, thumb]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: W,
    height: H,
    borderRadius: H / 2,
    borderWidth: 1,
    padding: PAD,
    justifyContent: 'center',
  },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2 },
});
