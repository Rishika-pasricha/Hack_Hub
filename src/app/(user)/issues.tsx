import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { colors, spacing, typography } from "../../constants/theme";
import { getMyIssues, resolveMyIssue } from "../../services/community";
import { Issue } from "../../types/community";
import { useAuth } from "../../context/AuthContext";

export default function IssuesTab() {
  const router = useRouter();
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadIssues = async () => {
    if (!user?.email) {
      setMessage("Please login first");
      return;
    }

    try {
      setWorking(true);
      setMessage(null);
      const data = await getMyIssues(user.email.toLowerCase());
      setIssues(data);
    } catch (err: any) {
      setMessage(err.message || "Failed to load your issues");
    } finally {
      setWorking(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadIssues();
    }, [user?.email])
  );

  const handleResolve = async (issueId: string) => {
    if (!user?.email) {
      return;
    }
    try {
      setWorking(true);
      setMessage(null);
      await resolveMyIssue(issueId, user.email.toLowerCase());
      await loadIssues();
      setMessage("Issue marked as resolved");
    } catch (err: any) {
      setMessage(err.message || "Failed to mark issue as resolved");
    } finally {
      setWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Civic Issues</Text>
        <PrimaryButton label="Submit Civic Issue" onPress={() => router.push("/submit-issue")} />
        <PrimaryButton label={working ? "Refreshing..." : "Refresh"} onPress={loadIssues} disabled={working} />
        {message ? <Text style={styles.info}>{message}</Text> : null}
        {issues.length === 0 ? <Text style={styles.hint}>No issues submitted yet.</Text> : null}
        {issues.map((issue) => (
          <View key={issue._id} style={styles.issueCard}>
            <Text style={styles.issueTitle}>{issue.subject}</Text>
            <Text style={styles.issueMeta}>Status: {issue.status === "resolved" ? "Resolved" : "Open"}</Text>
            <Text style={styles.issueMeta}>Submitted: {new Date(issue.createdAt).toLocaleString()}</Text>
            <Text style={styles.issueBody}>{issue.description}</Text>
            {issue.status === "open" ? (
              <PrimaryButton label="Solved" onPress={() => handleResolve(issue._id)} disabled={working} />
            ) : null}
          </View>
        ))}
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
    gap: spacing.md
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.text
  },
  hint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  info: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark
  },
  issueCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    padding: spacing.md,
    gap: spacing.sm
  },
  issueTitle: {
    fontSize: typography.sizes.md,
    color: colors.text,
    fontWeight: "700"
  },
  issueMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary
  },
  issueBody: {
    fontSize: typography.sizes.sm,
    color: colors.text
  }
});
