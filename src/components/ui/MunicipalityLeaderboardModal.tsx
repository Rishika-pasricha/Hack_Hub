import { useState, useCallback, useEffect } from "react";
import { ScrollView, StyleSheet, Text, View, Modal, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Public Performance</Text>
            <Text style={styles.title}>Top 10 Municipalities</Text>
            <Text style={styles.subtitle}>Ranked by issue resolution consistency</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>X</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centerHint}>Fetching latest municipality rankings...</Text>
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
            {leaderboard.map((entry, index) => {
              const rate = Math.max(0, Math.min(100, Number(entry.resolutionRate || 0)));

              return (
                <View key={entry.contactEmail} style={styles.leaderboardCard}>
                  <View style={styles.rankRow}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                    <View style={styles.municipalityInfo}>
                      <Text style={styles.municipalityName}>{entry.municipalityName}</Text>
                      <Text style={styles.district}>{entry.district}</Text>
                    </View>
                    <View style={styles.resolutionBadge}>
                      <Text style={styles.resolutionText}>{rate}%</Text>
                    </View>
                  </View>

                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${rate}%` }]} />
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
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  kicker: {
    fontSize: typography.sizes.xs,
    color: colors.surface,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
    opacity: 0.85
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.surface,
    marginBottom: 2
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.surface,
    opacity: 0.85
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center"
  },
  closeButtonText: {
    fontSize: typography.sizes.sm,
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
  centerHint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: "center"
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm
  },
  leaderboardCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
    gap: spacing.sm
  },
  rankText: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.primary,
    minWidth: 26
  },
  municipalityInfo: {
    flex: 1
  },
  municipalityName: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 1
  },
  district: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary
  },
  resolutionBadge: {
    minWidth: 50,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primaryDark,
    borderRadius: 6
  },
  resolutionText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.surface,
    textAlign: "center"
  },
  progressTrack: {
    height: 4,
    width: "100%",
    backgroundColor: colors.border,
    borderRadius: 99,
    overflow: "hidden",
    marginBottom: spacing.sm
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 99
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  stat: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  statValue: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 1
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border
  }
});
