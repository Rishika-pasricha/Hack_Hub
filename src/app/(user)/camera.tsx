import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../constants/theme";

export default function CameraTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera</Text>
      <Text style={styles.subtitle}>ML-based waste segregation module will be added here.</Text>
      <View style={styles.previewBox}>
        <Text style={styles.previewText}>Camera placeholder</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  previewBox: {
    flex: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    justifyContent: "center",
    alignItems: "center"
  },
  previewText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md
  }
});
