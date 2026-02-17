import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "../../constants/theme";

type TextFieldProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "phone-pad" | "email-address" | "numeric";
  error?: string;
  secureTextEntry?: boolean;
};

export function TextField({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  error,
  secureTextEntry = false
}: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg
  },
  label: {
    fontSize: typography.label,
    color: colors.text,
    marginBottom: spacing.sm
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.text
  },
  inputError: {
    borderColor: colors.error
  },
  error: {
    marginTop: spacing.xs,
    color: colors.error,
    fontSize: typography.small
  }
});
