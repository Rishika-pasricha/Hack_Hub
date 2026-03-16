import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { colors, spacing, radii, shadows } from '../../constants/theme';

interface CardProps extends ViewProps {
  elevation?: 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  borderColor?: string;
}

export const Card: React.FC<CardProps> = ({
  elevation = 'sm',
  padding = 'md',
  borderColor,
  style,
  children,
  ...props
}) => {
  const paddingValue = {
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg
  }[padding];

  const shadowStyle = shadows[elevation];

  return (
    <View
      style={[
        styles.base,
        {
          padding: paddingValue,
          ...shadowStyle,
          borderColor: borderColor || colors.border
        },
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden'
  }
});
