import { useState, useCallback, useEffect } from "react";
import { ScrollView, StyleSheet, Text, View, Modal, Pressable, ActivityIndicator } from "react-native";
import { colors, spacing, typography } from "../../constants/theme";
import { MunicipalityLeaderboardEntry } from "../../types/community";
import { getMunicipalityLeaderboard } from "../../services/community";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function MunicipalityLeaderboardModal({ visible, onClose }: Props) {
  const [leaderboard, setLeaderboard] = useState<MunicipalityLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMunicipalityLeaderboard();
      setLeaderboard(data);
    } catch (err: any) {
      setError(err.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadLeaderboard();
    }
  }, [visible, loadLeaderboard]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Municipality Leaderboard</Text>
          <Text style={styles.subtitle}>Ranked by Issue Resolution Activity</Text>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadLeaderboard}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : leaderboard.length === 0 ? (
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>No municipalities with issues yet</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
            {leaderboard.map((entry, index) => (
              <View key={entry.contactEmail} style={styles.leaderboardCard}>
                <View style={styles.rankRow}>
                  <View style={[
                    styles.rankBadge,
                    index === 0 && styles.rank1,
                    index === 1 && styles.rank2,
                    index === 2 && styles.rank3
                  ]}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.municipalityInfo}>
                    <Text style={styles.municipalityName}>{entry.municipalityName}</Text>
                    <Text style={styles.district}>{entry.district}</Text>
                  </View>
                  <View style={styles.resolutionBadge}>
                    <Text style={styles.resolutionText}>{entry.resolutionRate}%</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{entry.resolvedIssues}</Text>
                    <Text style={styles.statLabel}>Resolved</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{entry.openIssues}</Text>
                    <Text style={styles.statLabel}>Open</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{entry.totalIssues}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.surface,
    marginBottom: spacing.xs
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.surface,
    opacity: 0.8
  },
  closeButton: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.xl,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center"
  },
  closeButtonText: {
    fontSize: typography.sizes.lg,
    color: colors.surface,
    fontWeight: "700"
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md
  },
  errorText: {
    fontSize: typography.sizes.md,
    color: colors.error,
    textAlign: "center"
  },
  retryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 8
  },
  retryButtonText: {
    color: colors.surface,
    fontWeight: "600"
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: "center"
  },
  content: {
    flex: 1
  },
  contentPadding: {
    padding: spacing.xl,
    gap: spacing.md
  },
  leaderboardCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border || "#e0e0e0"
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.md
  },
  rankBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center"
  },
  rank1: {
    backgroundColor: "#FFD700"
  },
  rank2: {
    backgroundColor: "#C0C0C0"
  },
  rank3: {
    backgroundColor: "#CD7F32"
  },
  rankText: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.surface
  },
  municipalityInfo: {
    flex: 1
  },
  municipalityName: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs
  },
  district: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  resolutionBadge: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.success,
    borderRadius: 8
  },
  resolutionText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.surface
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border || "#e0e0e0"
  },
  stat: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border || "#e0e0e0"
  }
});
