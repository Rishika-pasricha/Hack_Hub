import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../constants/theme";
import { getApprovedBlogs } from "../../services/community";
import { BlogPost } from "../../types/community";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BlogsTab() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBlogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getApprovedBlogs();
      setBlogs(data);
    } catch (err: any) {
      setError(err.message || "Failed to load blogs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBlogs} />}
    >
      <Text style={styles.title}>Ecofy Blogs & Articles</Text>
      <Text style={styles.subtitle}>
        Municipality posts and approved community submissions appear here.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {blogs.length === 0 && !loading ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No approved content yet</Text>
          <Text style={styles.cardText}>Once municipalities approve submissions, posts will show here.</Text>
        </View>
      ) : null}

      {blogs.map((blog) => (
        <View key={blog._id} style={styles.card}>
          <Text style={styles.cardTitle}>{blog.title}</Text>
          <Text style={styles.meta}>
            By {blog.authorName} • {blog.sourceType === "municipality" ? "Municipality" : "User"}
          </Text>
          <Text style={styles.cardText}>{blog.content}</Text>
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
  meta: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary
  },
  cardText: {
    fontSize: typography.sizes.sm,
    color: colors.text
  },
  error: {
    color: colors.error,
    fontSize: typography.sizes.sm
  }
});
