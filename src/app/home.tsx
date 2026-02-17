import { StyleSheet, Text, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { colors, spacing, typography } from "../constants/theme";

export default function Home() {
  const router = useRouter();

  const handleLogout = () => {
    // TODO: Clear stored token/auth data
    router.push("/login");
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Ecofy</Text>
        <Text style={styles.subtitle}>Your Personal Eco Dashboard</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Carbon Footprint</Text>
          <Text style={styles.cardValue}>-- kg CO2</Text>
          <Text style={styles.cardSubtitle}>Track your impact this week</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Eco Points</Text>
          <Text style={styles.cardValue}>0</Text>
          <Text style={styles.cardSubtitle}>Earned by taking eco actions</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Environmental Impact</Text>
          <Text style={styles.cardValue}>Get Started</Text>
          <Text style={styles.cardSubtitle}>Learn how you can help</Text>
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
    fontSize: typography.sizes.xxxl,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: spacing.sm
  },
  subtitle: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  cardValue: {
    fontSize: typography.sizes.xxxl,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: spacing.sm
  },
  cardSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  footer: {
    padding: spacing.xl,
    gap: spacing.lg
  }
});
