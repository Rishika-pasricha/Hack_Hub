import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Image, Linking, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { colors, spacing, typography } from "../constants/theme";
import { approveBlogForAdmin, getIssuesForAdmin, getPendingBlogsForAdmin, notifyIssueCompletion } from "../services/community";
import { BlogPost, Issue } from "../types/community";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout, isHydrated } = useAuth();
  const municipalityEmail = user?.email || "";
  const [pendingBlogs, setPendingBlogs] = useState<BlogPost[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [processingIssueId, setProcessingIssueId] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    router.replace("/login");
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

  const handleIssueCompletion = async (issueId: string, adminName: string) => {
    try {
      setMessage(null);
      setProcessingIssueId(issueId);
      await notifyIssueCompletion(issueId, municipalityEmail.trim().toLowerCase(), adminName);
      setMessage("Completion notification sent to issue reporter");
    } catch (err: any) {
      setMessage(err.message || "Failed to send completion notification");
    } finally {
      setProcessingIssueId(null);
    }
  };

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "admin") {
      router.replace("/blogs");
      return;
    }
    loadData();
  }, [user, isHydrated]);

  if (!isHydrated || !user || user.role !== "admin") {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Municipality Admin Dashboard</Text>
        <Text style={styles.subtitle}>Review user issues and blog approvals</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Municipality Context</Text>
          <Text style={styles.cardMeta}>{municipalityEmail || "No municipality email found in session"}</Text>
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
          <Text style={styles.cardTitle}>Open Citizen Issues ({issues.length})</Text>
          {issues.length === 0 ? <Text style={styles.cardMeta}>No open issues</Text> : null}
          {issues.map((issue) => (
            <View key={issue._id} style={styles.itemBox}>
              <Text style={styles.itemTitle}>{issue.subject}</Text>
              <Text style={styles.cardMeta}>
                {issue.userName} ({issue.userEmail})
              </Text>
              <Text style={styles.itemBody}>{issue.description}</Text>
              
              {issue.media && issue.media.length > 0 && (
                <View style={styles.mediaContainer}>
                  <Text style={styles.mediaLabel}>Attachments ({issue.media.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                    {issue.media.map((media, idx) => (
                      <View key={idx} style={styles.mediaItem}>
                        {media.mediaType === 'image' ? (
                          <Image 
                            source={{ uri: media.mediaUrl }} 
                            style={styles.mediaImage}
                          />
                        ) : (
                          <TouchableOpacity 
                            style={styles.videoPlaceholder}
                            onPress={() => Linking.openURL(media.mediaUrl)}
                          >
                            <Text style={styles.videoIcon}>▶</Text>
                            <Text style={styles.videoText}>Video</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
              
              {issue.status === 'open' && (
                <PrimaryButton 
                  label={processingIssueId === issue._id ? "Sending..." : "✓ Completed"} 
                  onPress={() => handleIssueCompletion(issue._id, user?.firstName || "Admin")}
                  disabled={processingIssueId === issue._id}
                />
              )}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton label="Logout" onPress={handleLogout} />
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
  mediaContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  mediaLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  mediaScroll: {
    marginHorizontal: -spacing.md
  },
  mediaItem: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm
  },
  mediaImage: {
    width: 120,
    height: 120,
    borderRadius: spacing.sm,
    backgroundColor: colors.border
  },
  videoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: spacing.sm,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs
  },
  videoIcon: {
    fontSize: 32,
    color: colors.surface,
    fontWeight: "bold"
  },
  videoText: {
    fontSize: typography.sizes.xs,
    color: colors.surface,
    fontWeight: "600"
  },
  footer: {
    padding: spacing.xl
  }
});
