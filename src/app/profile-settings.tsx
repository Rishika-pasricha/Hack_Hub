import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { colors, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user, fullName, isHydrated, logout } = useAuth();

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/login");
    }
  }, [user, isHydrated]);

  if (!isHydrated || !user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your account and post preferences.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <Text style={styles.infoLine}>Name: {fullName || "Unknown User"}</Text>
          <Text style={styles.infoLine}>Email: {user.email}</Text>
          <Text style={styles.infoLine}>Area: {user.area || "Not set"}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Access</Text>
          <PrimaryButton label="My Posts" onPress={() => router.push("/my-posts")} />
          <PrimaryButton label="Civic Hub" onPress={() => router.push("/settings")} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Session</Text>
          <PrimaryButton
            label="Logout"
            onPress={() => {
              logout();
              router.replace("/login");
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.text
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text
  },
  infoLine: {
    fontSize: typography.sizes.sm,
    color: colors.text
  }
});
