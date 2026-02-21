import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useVideoPlayer, VideoView } from "expo-video";
import { colors, spacing, typography } from "../../constants/theme";
import { getApprovedBlogs, toggleBlogLike } from "../../services/community";
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
    createdPlayer.loop = false;
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
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [muteVideos, setMuteVideos] = useState(true);
  const [activeVideoKey, setActiveVideoKey] = useState<string | null>(null);
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

  useEffect(() => {
    loadBlogs();
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
      <ScrollView
        style={styles.container}
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
        <View style={styles.heroCard}>
          <Text style={styles.heroTop}>Hello, {greetingName}</Text>
          <Text style={styles.title}>Ecofy Community Feed</Text>
          <Text style={styles.subtitle}>
            Local updates, approved stories, and practical sustainability ideas from your municipality.
          </Text>
        </View>

        <Text style={styles.subtitle}>Municipality posts and approved community submissions appear here.</Text>
        <View style={styles.toolbarRow}>
          <Pressable style={styles.muteToggle} onPress={() => setMuteVideos((prev) => !prev)}>
            <Ionicons name={muteVideos ? "volume-mute-outline" : "volume-high-outline"} size={16} color={colors.textSecondary} />
            <Text style={styles.muteToggleText}>{muteVideos ? "Videos muted" : "Videos unmuted"}</Text>
          </Pressable>
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
                <Text style={styles.avatarText}>{getInitials(blog.authorName)}</Text>
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
                <Image
                  key={`${blog._id}-media-${index}`}
                  source={{ uri: mediaItem.mediaUrl }}
                  style={styles.mediaPreview}
                  resizeMode="cover"
                />
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
  heroCard: {
    backgroundColor: "#E9F8EE",
    borderRadius: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#C4E8CF",
    gap: spacing.xs
  },
  heroTop: {
    color: "#2D6A4F",
    fontSize: typography.sizes.sm,
    fontWeight: "600"
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
  toolbarRow: {
    flexDirection: "row",
    justifyContent: "flex-start"
  },
  muteToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface
  },
  muteToggleText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: "600"
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
