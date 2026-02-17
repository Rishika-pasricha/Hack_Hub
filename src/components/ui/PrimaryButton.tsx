import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radii, spacing, typography } from "../../constants/theme";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, disabled }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null
      ]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center"
  },
  buttonPressed: {
    backgroundColor: colors.primaryDark
  },
  buttonDisabled: {
    opacity: 0.6
  },
  text: {
    color: "#ffffff",
    fontSize: typography.body,
    fontWeight: "600"
  }
});
