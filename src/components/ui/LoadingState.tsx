import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle
} from 'react-native';
import { colors, spacing, radii, shadows } from '../../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height: number;
  style?: ViewStyle;
  borderRadius?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height,
  style,
  borderRadius = radii.md
}) => {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  }, [opacity]);

  const animatedStyle: any = {
    width,
    height,
    borderRadius,
    opacity
  };

  return (
    <Animated.View
      style={[
        styles.skeleton,
        animatedStyle,
        style
      ]}
    />
  );
};

interface LoadingStateProps {
  type?: 'card' | 'list-item' | 'text' | 'custom';
  count?: number;
  style?: ViewStyle;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'card',
  count = 3,
  style
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === 'card') {
    return (
      <View style={[styles.container, style]}>
        {items.map((i) => (
          <View key={i} style={styles.cardSkeleton}>
            <Skeleton height={180} style={{ marginBottom: spacing.md }} />
            <Skeleton width="80%" height={18} style={{ marginBottom: spacing.sm }} />
            <Skeleton width="60%" height={14} />
          </View>
        ))}
      </View>
    );
  }

  if (type === 'list-item') {
    return (
      <View style={[styles.container, style]}>
        {items.map((i) => (
          <View key={i} style={styles.listItemSkeleton}>
            <Skeleton width={44} height={44} borderRadius={22} style={{ marginRight: spacing.md }} />
            <View style={{ flex: 1 }}>
              <Skeleton width="70%" height={16} style={{ marginBottom: spacing.sm }} />
              <Skeleton width="90%" height={12} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (type === 'text') {
    return (
      <View style={[styles.container, style]}>
        <Skeleton width="100%" height={14} style={{ marginBottom: spacing.md }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: spacing.md }} />
        <Skeleton width="75%" height={14} />
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg
  },
  skeleton: {
    backgroundColor: colors.border,
    borderRadius: radii.md
  },
  cardSkeleton: {
    ...shadows.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    overflow: 'hidden'
  },
  listItemSkeleton: {
    ...shadows.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden'
  }
});
