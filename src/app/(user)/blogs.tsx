import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useVideoPlayer, VideoView } from "expo-video";
import { colors, spacing, typography } from "../../constants/theme";
import { getApprovedBlogs, getLikeNotifications, toggleBlogLike } from "../../services/community";
import { BlogPost } from "../../types/community";
import { useAuth } from "../../context/AuthContext";

type FeedVideoProps = {
  videoKey: string;
  uri: string;
  muteVideos: boolean;
  activeVideoKey: string | null;
  onVideoPlay: (videoKey: string) => void;
  onManualPause: (videoKey: string) => void;
  onManualPlay: (videoKey: string) => void;
  onLayoutMeasured: (videoKey: string, y: number, height: number) => void;
};

function FeedVideo({
  videoKey,
  uri,
  muteVideos,
  activeVideoKey,
  onVideoPlay,
  onManualPause,
  onManualPlay,
  onLayoutMeasured
}: FeedVideoProps) {
  const videoViewRef = useRef<VideoView | null>(null);
  const player = useVideoPlayer(uri, (createdPlayer) => {
    createdPlayer.loop = true;
  });

  useEffect(() => {
    player.muted = muteVideos;
  }, [muteVideos, player]);

  useEffect(() => {
    if (activeVideoKey === videoKey && !player.playing) {
      player.play();
      return;
    }
    if (activeVideoKey !== videoKey && player.playing) {
      player.pause();
    }
  }, [activeVideoKey, player, videoKey]);

  useEffect(() => {
    const subscription = player.addListener("playingChange", (payload) => {
      if (payload.isPlaying) {
        onVideoPlay(videoKey);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [onVideoPlay, player, videoKey]);

  const handleTogglePlayback = () => {
    if (player.playing) {
      player.pause();
      onManualPause(videoKey);
      return;
    }
    player.play();
    onManualPlay(videoKey);
  };

  const handleEnterFullscreen = async () => {
    try {
      await videoViewRef.current?.enterFullscreen();
    } catch {
      // Ignore fullscreen failures on unsupported environments.
    }
  };

  return (
    <View
      style={styles.videoCard}
      onLayout={(event) => onLayoutMeasured(videoKey, event.nativeEvent.layout.y, event.nativeEvent.layout.height)}
    >
      <VideoView ref={videoViewRef} player={player} style={styles.videoPlayer} nativeControls={false} contentFit="cover" />
      <Pressable style={styles.videoTouchOverlay} onPress={handleTogglePlayback} />
      <Pressable style={styles.videoFullscreenButton} onPress={handleEnterFullscreen}>
        <Ionicons name="expand-outline" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export default function BlogsTab() {
  const router = useRouter();
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [muteVideos, setMuteVideos] = useState(true);
  const [activeVideoKey, setActiveVideoKey] = useState<string | null>(null);
  const [expandedImageUri, setExpandedImageUri] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: "post_like" | "product_reported" | "product_removed";
      message: string;
      createdAt: string;
      postId?: string;
      postTitle?: string;
      productId?: string;
      productName?: string;
    }>
  >([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const scrollYRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const videoLayoutRef = useRef<Record<string, { y: number; height: number }>>({});
  const manuallyPausedVideoKeyRef = useRef<string | null>(null);

  const greetingName = useMemo(() => {
    if (!user) {
      return "Community";
    }
    return user.firstName?.trim() || "Community";
  }, [user]);

  const profileInitials = useMemo(() => {
    if (!user) {
      return "U";
    }
    const raw = `${user.firstName || ""} ${user.lastName || ""}`;
    const chunks = raw
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    if (chunks.length === 0) {
      return "U";
    }
    return chunks.map((chunk) => chunk[0]?.toUpperCase() || "").join("");
  }, [user]);

  const toRelativeDate = (iso: string) => {
    const postedAt = new Date(iso).getTime();
    if (!Number.isFinite(postedAt)) {
      return "recently";
    }
    const minutes = Math.max(1, Math.floor((Date.now() - postedAt) / (1000 * 60)));
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getInitials = (name: string) => {
    const chunks = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    if (chunks.length === 0) {
      return "U";
    }
    return chunks.map((chunk) => chunk[0]?.toUpperCase() || "").join("");
  };

  const loadBlogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getApprovedBlogs(undefined, user?.email);
      setBlogs(data);
    } catch (err: any) {
      setError(err.message || "Failed to load blogs");
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!user?.email) {
      return;
    }
    try {
      setNotificationsLoading(true);
      const data = await getLikeNotifications(user.email.toLowerCase());
      setNotifications(data);
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
    loadNotifications();
  }, [user?.email]);

  useEffect(() => {
    const visibleVideoKeys = new Set<string>();
    blogs.forEach((blog) => {
      (blog.media || []).forEach((mediaItem, index) => {
        if (mediaItem.mediaType === "video") {
          visibleVideoKeys.add(`${blog._id}-media-${index}`);
        }
      });
    });
    if (activeVideoKey && !visibleVideoKeys.has(activeVideoKey)) {
      setActiveVideoKey(null);
    }
  }, [blogs]);

  const updateAutoplayByViewport = useCallback(() => {
    const viewportHeight = viewportHeightRef.current;
    if (!viewportHeight) {
      return;
    }

    const viewportTop = scrollYRef.current;
    const viewportBottom = viewportTop + viewportHeight;
    let nextKey: string | null = null;
    let bestRatio = 0;

    for (const [videoKey, layout] of Object.entries(videoLayoutRef.current)) {
      const top = layout.y;
      const bottom = layout.y + layout.height;
      const overlap = Math.max(0, Math.min(viewportBottom, bottom) - Math.max(viewportTop, top));
      const ratio = overlap / Math.max(1, layout.height);
      if (ratio > bestRatio) {
        bestRatio = ratio;
        nextKey = videoKey;
      }
    }

    const threshold = 0.45;
    let targetKey = bestRatio >= threshold ? nextKey : null;
    if (targetKey && targetKey === manuallyPausedVideoKeyRef.current) {
      targetKey = null;
    }

    if (targetKey && targetKey !== manuallyPausedVideoKeyRef.current) {
      manuallyPausedVideoKeyRef.current = null;
    }

    setActiveVideoKey((previous) => (previous === targetKey ? previous : targetKey));
  }, []);

  const handleVideoLayoutMeasured = useCallback(
    (videoKey: string, y: number, height: number) => {
      videoLayoutRef.current[videoKey] = { y, height };
      updateAutoplayByViewport();
    },
    [updateAutoplayByViewport]
  );

  const handleVideoPlay = useCallback((videoKey: string) => {
    setActiveVideoKey(videoKey);
  }, []);

  const handleManualPause = useCallback((videoKey: string) => {
    manuallyPausedVideoKeyRef.current = videoKey;
    setActiveVideoKey((previous) => (previous === videoKey ? null : previous));
  }, []);

  const handleManualPlay = useCallback((videoKey: string) => {
    manuallyPausedVideoKeyRef.current = null;
    setActiveVideoKey(videoKey);
  }, []);

  const handleToggleLike = async (blogId: string) => {
    if (!user?.email || likingPostId) {
      return;
    }

    const existing = blogs.find((post) => post._id === blogId);
    if (!existing) {
      return;
    }

    const currentlyLiked = Boolean(existing.likedByCurrentUser);
    const currentCount = existing.likesCount ?? existing.likes?.length ?? 0;
    const optimisticCount = currentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1;

    setBlogs((prev) =>
      prev.map((post) =>
        post._id === blogId
          ? {
              ...post,
              likedByCurrentUser: !currentlyLiked,
              likesCount: optimisticCount
            }
          : post
      )
    );

    setLikingPostId(blogId);
    try {
      const response = await toggleBlogLike(blogId, user.email);
      setBlogs((prev) =>
        prev.map((post) =>
          post._id === blogId
            ? {
                ...post,
                likedByCurrentUser: response.liked,
                likesCount: response.likesCount
              }
            : post
        )
      );
    } catch {
      setBlogs((prev) =>
        prev.map((post) =>
          post._id === blogId
            ? {
                ...post,
                likedByCurrentUser: currentlyLiked,
                likesCount: currentCount
              }
            : post
        )
      );
    } finally {
      setLikingPostId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.brandTitle}>Ecofy</Text>
        <View style={styles.topActions}>
          <Pressable
            style={styles.notificationButton}
            onPress={() => {
              setNotificationsOpen(true);
              loadNotifications();
            }}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            {notifications.length > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{Math.min(notifications.length, 9)}+</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable style={styles.profileMenuTrigger} onPress={() => setProfileMenuOpen(true)}>
            <View style={styles.profileButton}>
              {user?.profileImageUrl ? (
                <Image source={{ uri: user.profileImageUrl }} style={styles.profileButtonImage} resizeMode="cover" />
              ) : (
                <Text style={styles.profileButtonText}>{profileInitials}</Text>
              )}
            </View>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.feedScroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBlogs} />}
        scrollEventThrottle={16}
        onLayout={(event) => {
          viewportHeightRef.current = event.nativeEvent.layout.height;
          updateAutoplayByViewport();
        }}
        onScroll={(event) => {
          scrollYRef.current = event.nativeEvent.contentOffset.y;
          updateAutoplayByViewport();
        }}
      >
        <View style={styles.helloBlock}>
          <Text style={styles.helloText}>Hello, {greetingName}</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {blogs.length === 0 && !loading ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No approved content yet</Text>
            <Text style={styles.cardText}>Once municipalities approve submissions, posts will show here.</Text>
          </View>
        ) : null}

        {blogs.map((blog) => (
          <View key={blog._id} style={styles.card}>
            <View style={styles.postHeader}>
              <View style={styles.avatar}>
                {blog.authorProfileImageUrl ? (
                  <Image source={{ uri: blog.authorProfileImageUrl }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.avatarText}>{getInitials(blog.authorName)}</Text>
                )}
              </View>
              <View style={styles.postHeaderText}>
                <Text style={styles.authorName}>{blog.authorName}</Text>
                <Text style={styles.meta}>
                  {blog.sourceType === "municipality" ? "Municipality" : "Community Member"} | {toRelativeDate(blog.createdAt)}
                </Text>
              </View>
            </View>

            <Text style={styles.cardTitle}>{blog.title}</Text>
            {blog.content ? <Text style={styles.cardText}>{blog.content}</Text> : null}

            {blog.media?.map((mediaItem, index) =>
              mediaItem.mediaType === "image" ? (
                <Pressable key={`${blog._id}-media-${index}`} onPress={() => setExpandedImageUri(mediaItem.mediaUrl)}>
                  <Image source={{ uri: mediaItem.mediaUrl }} style={styles.mediaPreview} resizeMode="cover" />
                </Pressable>
              ) : (
                <FeedVideo
                  key={`${blog._id}-media-${index}`}
                  videoKey={`${blog._id}-media-${index}`}
                  uri={mediaItem.mediaUrl}
                  muteVideos={muteVideos}
                  activeVideoKey={activeVideoKey}
                  onVideoPlay={handleVideoPlay}
                  onManualPause={handleManualPause}
                  onManualPlay={handleManualPlay}
                  onLayoutMeasured={handleVideoLayoutMeasured}
                />
              )
            )}

            <View style={styles.footerRow}>
              <Pressable
                onPress={() => handleToggleLike(blog._id)}
                disabled={likingPostId === blog._id || !user?.email}
                style={styles.likeButton}
              >
                <Ionicons
                  name={blog.likedByCurrentUser ? "heart" : "heart-outline"}
                  size={18}
                  color={blog.likedByCurrentUser ? "#D43F3A" : colors.textSecondary}
                />
                <Text style={styles.likeText}>{blog.likesCount ?? blog.likes?.length ?? 0} likes</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      <Modal visible={notificationsOpen} transparent animationType="fade" onRequestClose={() => setNotificationsOpen(false)}>
        <Pressable style={styles.profileMenuBackdrop} onPress={() => setNotificationsOpen(false)}>
          <View style={styles.notificationsCard}>
            <Text style={styles.notificationsTitle}>Notifications</Text>
            {notificationsLoading ? <Text style={styles.notificationsMeta}>Loading...</Text> : null}
            {!notificationsLoading && notifications.length === 0 ? (
              <Text style={styles.notificationsMeta}>No notifications yet</Text>
            ) : null}
            {!notificationsLoading
              ? notifications.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (item.productId) {
                        setNotificationsOpen(false);
                        router.push({
                          pathname: "/my-products",
                          params: { focusProductId: item.productId }
                        });
                      }
                    }}
                  >
                    <Text style={styles.notificationItemText}>{item.message}</Text>
                  </Pressable>
                ))
              : null}
          </View>
        </Pressable>
      </Modal>
      <Modal visible={Boolean(expandedImageUri)} transparent animationType="fade" onRequestClose={() => setExpandedImageUri(null)}>
        <View style={styles.imageModalBackdrop}>
          <Pressable style={styles.imageModalClose} onPress={() => setExpandedImageUri(null)}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
          <Pressable style={styles.imageModalContent} onPress={() => setExpandedImageUri(null)}>
            {expandedImageUri ? <Image source={{ uri: expandedImageUri }} style={styles.expandedImage} resizeMode="contain" /> : null}
          </Pressable>
        </View>
      </Modal>
      <Modal visible={profileMenuOpen} transparent animationType="fade" onRequestClose={() => setProfileMenuOpen(false)}>
        <Pressable style={styles.profileMenuBackdrop} onPress={() => setProfileMenuOpen(false)}>
          <View style={styles.profileMenuCard}>
            <Pressable
              style={styles.profileMenuItem}
              onPress={() => {
                setProfileMenuOpen(false);
                router.push("/profile-settings");
              }}
            >
              <Ionicons name="settings-outline" size={18} color={colors.text} />
              <Text style={styles.profileMenuText}>Settings</Text>
            </Pressable>
            <Pressable
              style={styles.profileMenuItem}
              onPress={() => {
                setProfileMenuOpen(false);
                router.push("/my-posts");
              }}
            >
              <Ionicons name="document-text-outline" size={18} color={colors.text} />
              <Text style={styles.profileMenuText}>My Posts</Text>
            </Pressable>
          </View>
        </Pressable>
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.lg
  },
  feedScroll: {
    flex: 1
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2D6A4F",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: typography.sizes.lg,
    fontWeight: "800"
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E5484D",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700"
  },
  profileMenuTrigger: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#F4FFF8"
  },
  helloBlock: {
    backgroundColor: "#E9F8EE",
    borderWidth: 1,
    borderColor: "#C4E8CF",
    borderRadius: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  helloText: {
    color: "#1C5D43",
    fontSize: typography.sizes.md,
    fontWeight: "700"
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#4AA271"
  },
  profileButtonText: {
    color: "#1C5D43",
    fontWeight: "700",
    fontSize: typography.sizes.sm
  },
  profileButtonImage: {
    width: "100%",
    height: "100%",
    borderRadius: 21
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#D9F2E2",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: "#1C5D43",
    fontWeight: "700",
    fontSize: typography.sizes.sm
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 19
  },
  postHeaderText: {
    flex: 1
  },
  authorName: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: "700"
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
  mediaPreview: {
    width: "100%",
    height: 220,
    borderRadius: spacing.sm,
    backgroundColor: colors.background
  },
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    alignItems: "center",
    justifyContent: "center"
  },
  imageModalClose: {
    position: "absolute",
    top: 52,
    right: 20,
    zIndex: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)"
  },
  imageModalContent: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  expandedImage: {
    width: "100%",
    height: "82%"
  },
  profileMenuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.12)"
  },
  profileMenuCard: {
    position: "absolute",
    top: 86,
    right: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 170,
    overflow: "hidden"
  },
  profileMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  profileMenuText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: "600"
  },
  notificationsCard: {
    position: "absolute",
    top: 86,
    right: spacing.xl + 58,
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 260,
    maxWidth: 320,
    padding: spacing.md,
    gap: spacing.sm
  },
  notificationsTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text
  },
  notificationsMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary
  },
  notificationItemText: {
    fontSize: typography.sizes.sm,
    color: colors.text
  },
  videoCard: {
    borderRadius: spacing.sm,
    overflow: "hidden",
    backgroundColor: colors.background
  },
  videoPlayer: {
    width: "100%",
    height: 240,
    backgroundColor: "#000000"
  },
  videoTouchOverlay: {
    ...StyleSheet.absoluteFillObject
  },
  videoFullscreenButton: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)"
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: spacing.xs
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999
  },
  likeText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: "600"
  },
  error: {
    color: colors.error,
    fontSize: typography.sizes.sm
  }
});
