import React, { useRef } from 'react';
import {
  Animated,
  TouchableOpacity,
  Text,
  StyleSheet,
  GestureResponderEvent,
  ActivityIndicator,
  ViewStyle,
  TextStyle
} from 'react-native';
import { colors, spacing, radii, animations, typography } from '../../constants/theme';

interface AnimatedButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: animations.fast,
      useNativeDriver: true
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: animations.fast,
      useNativeDriver: true
    }).start();
  };

  const sizeStyles = {
    sm: {
      height: 36,
      paddingHorizontal: spacing.md,
      fontSize: typography.sizes.sm
    },
    md: {
      height: 44,
      paddingHorizontal: spacing.lg,
      fontSize: typography.sizes.md
    },
    lg: {
      height: 52,
      paddingHorizontal: spacing.xl,
      fontSize: typography.sizes.lg
    }
  };

  const variantStyles = {
    primary: {
      backgroundColor: disabled ? colors.muted : colors.primary,
      borderWidth: 0,
      borderColor: 'transparent',
      color: colors.surface
    },
    secondary: {
      backgroundColor: disabled ? colors.border : colors.primaryLight,
      borderWidth: 0,
      borderColor: 'transparent',
      color: colors.surface
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: disabled ? colors.border : colors.primary,
      color: disabled ? colors.muted : colors.primary
    }
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[
          styles.button,
          {
            height: currentSize.height,
            paddingHorizontal: currentSize.paddingHorizontal,
            backgroundColor: currentVariant.backgroundColor,
            borderColor: currentVariant.borderColor,
            borderWidth: currentVariant.borderWidth
          },
          style
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'outline' ? currentVariant.color : colors.surface}
            size="small"
          />
        ) : (
          <Text
            style={[
              styles.label,
              {
                fontSize: currentSize.fontSize,
                color: currentVariant.color
              }
            ]}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.md,
    flexDirection: 'row'
  },
  label: {
    fontWeight: '600',
    textAlign: 'center'
  }
});
