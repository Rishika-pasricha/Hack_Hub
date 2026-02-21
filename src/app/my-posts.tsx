import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextField } from "../components/ui/TextField";
import { colors, spacing, typography } from "../constants/theme";
import { deleteMyBlog, getMyBlogs, updateMyBlog } from "../services/community";
import { BlogPost } from "../types/community";
import { useAuth } from "../context/AuthContext";

export default function MyPostsScreen() {
  const router = useRouter();
  const { user, isHydrated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", content: "" });

  const canEdit = useMemo(() => Boolean(user?.email), [user?.email]);

  const loadMyPosts = async () => {
    if (!user?.email) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      const data = await getMyBlogs(user.email.toLowerCase());
      setPosts(data);
    } catch (err: any) {
      setMessage(err.message || "Failed to load your posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/login");
      return;
    }
    loadMyPosts();
  }, [user?.email, isHydrated]);

  if (!isHydrated || !user) {
    return null;
  }

  const handleOpenEdit = (post: BlogPost) => {
    setEditingPost(post);
    setEditForm({
      title: post.title || "",
      content: post.content || ""
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPost || !user?.email) {
      return;
    }

    if (!editForm.title.trim()) {
      setMessage("Title is required");
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      await updateMyBlog(editingPost._id, {
        authorEmail: user.email.toLowerCase(),
        title: editForm.title,
        content: editForm.content
      });
      setEditingPost(null);
      setMessage("Post updated successfully");
      await loadMyPosts();
    } catch (err: any) {
      setMessage(err.message || "Failed to update post");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    if (!user?.email) {
      return;
    }

    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setMessage(null);
            await deleteMyBlog(postId, user.email.toLowerCase());
            setMessage("Post deleted");
            await loadMyPosts();
          } catch (err: any) {
            setMessage(err.message || "Failed to delete post");
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadMyPosts} />}
      >
        <Text style={styles.title}>My Posts</Text>
        <Text style={styles.subtitle}>Edit or remove your submitted community posts.</Text>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        {posts.length === 0 && !loading ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No posts yet</Text>
            <Text style={styles.cardText}>Your submitted posts will appear here.</Text>
          </View>
        ) : null}

        {posts.map((post) => (
          <View key={post._id} style={styles.card}>
            <Text style={styles.cardTitle}>{post.title}</Text>
            <Text style={styles.meta}>Status: {post.status}</Text>
            {post.content ? <Text style={styles.cardText}>{post.content}</Text> : null}
            <View style={styles.actionsRow}>
              <PrimaryButton label="Edit" onPress={() => handleOpenEdit(post)} disabled={!canEdit} />
              <PrimaryButton label="Delete" onPress={() => handleDeletePost(post._id)} disabled={!canEdit} />
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={Boolean(editingPost)} transparent animationType="fade" onRequestClose={() => setEditingPost(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Post</Text>
            <TextField
              label="Title"
              value={editForm.title}
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, title: value }))}
            />
            <Text style={styles.inputLabel}>Content</Text>
            <TextInput
              style={styles.textArea}
              multiline
              value={editForm.content}
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, content: value }))}
              placeholder="Write your post"
              placeholderTextColor={colors.muted}
            />
            <View style={styles.modalActions}>
              <PrimaryButton label="Cancel" onPress={() => setEditingPost(null)} />
              <PrimaryButton label={saving ? "Saving..." : "Save"} onPress={handleSaveEdit} disabled={saving} />
            </View>
          </View>
        </View>
      </Modal>
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
  message: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
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
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: spacing.xl
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    color: colors.text,
    textAlignVertical: "top"
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm
  }
});
