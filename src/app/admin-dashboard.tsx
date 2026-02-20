import { StyleSheet, Text, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { colors, spacing, typography } from "../constants/theme";

export default function AdminDashboard() {
  const router = useRouter();

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Municipality Admin Dashboard</Text>
        <Text style={styles.subtitle}>Basic admin view</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reports Overview</Text>
          <Text style={styles.cardValue}>Coming Soon</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Citizen Requests</Text>
          <Text style={styles.cardValue}>Coming Soon</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Collection Status</Text>
          <Text style={styles.cardValue}>Coming Soon</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton label="Logout" onPress={handleLogout} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primary,
    alignItems: "center"
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "bold",
    color: colors.text,
    textAlign: "center"
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.sm
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary
  },
  cardValue: {
    fontSize: typography.sizes.lg,
    fontWeight: "bold",
    color: colors.primary,
    marginTop: spacing.sm
  },
  footer: {
    padding: spacing.xl
  }
});
