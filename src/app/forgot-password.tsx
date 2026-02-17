import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { colors, spacing, typography } from "../constants/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>Password reset feature coming soon</Text>
      <PrimaryButton label="Back to Login" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    justifyContent: "center",
    alignItems: "center"
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: spacing.sm
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl
  }
});
