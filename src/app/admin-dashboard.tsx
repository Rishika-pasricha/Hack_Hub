import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextField } from "../components/ui/TextField";
import { colors, spacing, typography } from "../constants/theme";
import { approveBlogForAdmin, getIssuesForAdmin, getPendingBlogsForAdmin } from "../services/community";
import { BlogPost, Issue } from "../types/community";

export default function AdminDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams<{ municipalityEmail?: string }>();
  const [municipalityEmail, setMunicipalityEmail] = useState(params.municipalityEmail || "");
  const [pendingBlogs, setPendingBlogs] = useState<BlogPost[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogout = () => {
    router.push("/login");
  };

  const loadData = async () => {
    if (!municipalityEmail.trim()) {
      setMessage("Enter municipality email to load dashboard data");
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      const [blogs, issueList] = await Promise.all([
        getPendingBlogsForAdmin(municipalityEmail.trim().toLowerCase()),
        getIssuesForAdmin(municipalityEmail.trim().toLowerCase())
      ]);
      setPendingBlogs(blogs);
      setIssues(issueList);
    } catch (err: any) {
      setMessage(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (blogId: string) => {
    try {
      setMessage(null);
      await approveBlogForAdmin(blogId, municipalityEmail.trim().toLowerCase());
      setMessage("Blog approved successfully");
      await loadData();
    } catch (err: any) {
      setMessage(err.message || "Failed to approve blog");
    }
  };

  useEffect(() => {
    if (municipalityEmail) {
      loadData();
    }
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Municipality Admin Dashboard</Text>
        <Text style={styles.subtitle}>Review user issues and blog approvals</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Municipality Context</Text>
          <TextField
            label="Municipality Email"
            value={municipalityEmail}
            onChangeText={setMunicipalityEmail}
            keyboardType="email-address"
          />
          <PrimaryButton label={loading ? "Loading..." : "Refresh Data"} onPress={loadData} disabled={loading} />
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pending Blogs ({pendingBlogs.length})</Text>
          {pendingBlogs.length === 0 ? <Text style={styles.cardMeta}>No pending blogs</Text> : null}
          {pendingBlogs.map((blog) => (
            <View key={blog._id} style={styles.itemBox}>
              <Text style={styles.itemTitle}>{blog.title}</Text>
              <Text style={styles.cardMeta}>By: {blog.authorName}</Text>
              <Text style={styles.itemBody}>{blog.content}</Text>
              <PrimaryButton label="Approve" onPress={() => handleApprove(blog._id)} />
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Citizen Issues ({issues.length})</Text>
          {issues.length === 0 ? <Text style={styles.cardMeta}>No issues submitted</Text> : null}
          {issues.map((issue) => (
            <View key={issue._id} style={styles.itemBox}>
              <Text style={styles.itemTitle}>{issue.subject}</Text>
              <Text style={styles.cardMeta}>
                {issue.userName} ({issue.userEmail})
              </Text>
              <Text style={styles.itemBody}>{issue.description}</Text>
            </View>
          ))}
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
  message: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark,
    marginTop: spacing.sm
  },
  cardMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  itemBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.sm
  },
  itemTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text
  },
  itemBody: {
    fontSize: typography.sizes.sm,
    color: colors.text
  },
  footer: {
    padding: spacing.xl
  }
});
