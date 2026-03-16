import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { MunicipalityLeaderboardModal } from "../components/ui/MunicipalityLeaderboardModal";
import { colors, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { getMunicipalityActivityMetrics } from "../services/community";

type ActivityMetrics = {
  municipalityName: string;
  district: string;
  totalIssues: number;
  resolvedIssues: number;
  openIssues: number;
  resolvedThisMonth: number;
  avgResolutionTime: number;
  activeCitizensCount: number;
  approvedBlogsThisMonth: number;
  productsListedThisMonth: number;
};

export default function Home() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ActivityMetrics | null>(null);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);

  useEffect(() => {
    loadActivityMetrics();
  }, [user?.area]);

  const loadActivityMetrics = async () => {
    try {
      setLoading(true);
      setMessage(null);
      // Get the municipality email from the user's area
      let municipalityEmail = (user as any)?.municipalityEmail;
      
      if (!municipalityEmail) {
        setMessage("Municipality information not available");
        return;
      }

      const data = await getMunicipalityActivityMetrics(municipalityEmail);
      setMetrics(data);
    } catch (err: any) {
      setMessage("Unable to load municipality metrics");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Ecofy</Text>
          <Text style={styles.subtitle}>Municipality Dashboard</Text>
        </View>

        <View style={styles.content}>
          {message && <Text style={styles.errorMessage}>{message}</Text>}
          
          {metrics ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Municipality</Text>
                <Text style={styles.cardValue}>{metrics.municipalityName}</Text>
                <Text style={styles.cardSubtitle}>{metrics.district}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Total Issues</Text>
                <Text style={styles.cardValue}>{metrics.totalIssues}</Text>
                <Text style={styles.cardSubtitle}>Reported in your area</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Issues Resolved</Text>
                <Text style={styles.cardValue}>{metrics.resolvedIssues}</Text>
                <Text style={styles.cardSubtitle}>
                  {metrics.totalIssues > 0 
                    ? `${((metrics.resolvedIssues / metrics.totalIssues) * 100).toFixed(1)}% resolution rate`
                    : "No issues yet"
                  }
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Open Issues</Text>
                <Text style={styles.cardValue}>{metrics.openIssues}</Text>
                <Text style={styles.cardSubtitle}>Awaiting resolution</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>This Month</Text>
                <Text style={styles.cardSubtitle}>
                  ✓ {metrics.resolvedThisMonth} issues resolved
                </Text>
                <Text style={styles.cardSubtitle}>
                  ✓ {metrics.approvedBlogsThisMonth} blogs approved
                </Text>
                <Text style={styles.cardSubtitle}>
                  ✓ {metrics.productsListedThisMonth} products listed
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Average Resolution Time</Text>
                <Text style={styles.cardValue}>{metrics.avgResolutionTime} days</Text>
                <Text style={styles.cardSubtitle}>From report to resolution</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Active Citizens</Text>
                <Text style={styles.cardValue}>{metrics.activeCitizensCount}</Text>
                <Text style={styles.cardSubtitle}>Participating in the platform</Text>
              </View>

              <PrimaryButton 
                label="View Leaderboard"
                onPress={() => setLeaderboardVisible(true)}
              />
            </>
          ) : (
            <Text style={styles.loadingText}>{loading ? "Loading metrics..." : "No metrics available"}</Text>
          )}
        </View>

        <View style={styles.footer}>
          <PrimaryButton label="Logout" onPress={handleLogout} />
        </View>

        {leaderboardVisible && (
          <MunicipalityLeaderboardModal
            visible={leaderboardVisible}
            onClose={() => setLeaderboardVisible(false)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
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
  errorMessage: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.lg
  },
  footer: {
    padding: spacing.xl,
    gap: spacing.lg
  }
});
