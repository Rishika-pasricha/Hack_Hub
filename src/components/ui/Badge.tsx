import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle
} from 'react-native';
import { colors, spacing, radii, typography } from '../../constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'muted';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'muted',
  size = 'md',
  style
}) => {
  const variantStyles = {
    success: {
      backgroundColor: colors.successLight,
      color: colors.success
    },
    error: {
      backgroundColor: colors.errorLight,
      color: colors.error
    },
    warning: {
      backgroundColor: '#fef3c7',
      color: colors.warning
    },
    info: {
      backgroundColor: '#e0f2fe',
      color: colors.info
    },
    muted: {
      backgroundColor: colors.border,
      color: colors.textSecondary
    }
  };

  const sizeStyles = {
    sm: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      fontSize: typography.sizes.xs
    },
    md: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: typography.sizes.sm
    },
    lg: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: typography.sizes.md
    }
  };

  const current = variantStyles[variant];
  const current_size = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: current.backgroundColor,
          paddingHorizontal: current_size.paddingHorizontal,
          paddingVertical: current_size.paddingVertical
        },
        style
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: current.color,
            fontSize: current_size.fontSize
          }
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.md,
    alignSelf: 'flex-start'
  },
  label: {
    fontWeight: '600',
    textAlign: 'center'
  }
});
