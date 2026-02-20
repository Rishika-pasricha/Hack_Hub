import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../constants/theme";

export default function ShopTab() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Best Out Of Waste Shop</Text>
      <Text style={styles.subtitle}>Users will be able to buy and sell upcycled products here.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Marketplace</Text>
        <Text style={styles.cardText}>Coming soon: product listings, checkout, and seller dashboard.</Text>
      </View>
    </ScrollView>
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
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text
  },
  cardText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  }
});
