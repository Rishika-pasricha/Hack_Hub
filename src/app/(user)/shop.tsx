import { useCallback, useState, useMemo } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  RefreshControl
} from "react-native";
import { colors, spacing, typography } from "../../constants/theme";
import { getProducts } from "../../services/community";
import { Product } from "../../types/community";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ShopTab() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const data = await getProducts();
      setProducts(data);
      setMessage(null);
    } catch (err: any) {
      setMessage(err.message || "Failed to load products");
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, [loadProducts]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const handleProductPress = useCallback((product: Product) => {
    // Store product ID for quick lookup
    router.push({
      pathname: "/product/[id]",
      params: { id: product._id }
    });
  }, [router]);

  const renderHeader = useMemo(() => (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <Pressable style={styles.menuButton} onPress={() => setDrawerOpen(true)}>
          <Text style={styles.menuButtonText}>Menu</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>Best Out Of Waste Shop</Text>
      <Text style={styles.subtitle}>Community marketplace to buy and sell upcycled products.</Text>
      {message ? <Text style={styles.info}>{message}</Text> : null}
      {products.length === 0 ? <Text style={styles.cardText}>No products uploaded yet.</Text> : null}
    </View>
  ), [message, products.length]);

  const renderItem = useCallback(({ item }: { item: Product }) => {
    const thumbnailUri = item.productMedia?.[0]?.mediaUrl || item.productImageUrl || "";
    return (
      <Pressable
        style={({ pressed }) => [
          styles.productCard,
          pressed && styles.productCardPressed
        ]}
        onPress={() => handleProductPress(item)}
      >
        <View style={styles.imageContainer}>
          {item.productMedia && item.productMedia.length > 1 && (
            <View style={styles.mediaCountBadge}>
              <Text style={styles.mediaCountBadgeText}>{item.productMedia.length}</Text>
            </View>
          )}
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage]}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
        </View>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.productName}
        </Text>
        <Text style={styles.productPrice}>Rs. {item.price}</Text>
        <Text style={styles.tapHint}>Tap to view details</Text>
      </Pressable>
    );
  }, [handleProductPress]);

  return (
    <SafeAreaView style={styles.container}>
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        renderItem={renderItem}
      />

      <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setDrawerOpen(false)} />
          <View style={styles.drawerPanel}>
            <Text style={styles.drawerTitle}>Marketplace</Text>
            <Pressable
              style={styles.drawerItem}
              onPress={() => {
                setDrawerOpen(false);
                router.push("/upload-product");
              }}
            >
              <Text style={styles.drawerItemText}>Upload Product</Text>
            </Pressable>
            <Pressable
              style={styles.drawerItem}
              onPress={() => {
                setDrawerOpen(false);
                // My Products - coming soon
              }}
              disabled
            >
              <Text style={[styles.drawerItemText, { opacity: 0.5 }]}>My Products (Coming Soon)</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { paddingBottom: spacing.lg, gap: spacing.sm },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "flex-start"
  },
  menuButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  menuButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: "700"
  },
  row: { justifyContent: "space-between", marginBottom: spacing.md },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.text
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  cardText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  info: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark
  },
  productCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2
  },
  productCardPressed: {
    opacity: 0.7,
    elevation: 5,
    shadowOpacity: 0.15
  },
  productTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm
  },
  productPrice: {
    fontSize: typography.sizes.md,
    color: colors.primaryDark,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs
  },
  tapHint: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  productImage: {
    width: "100%",
    height: 130,
    backgroundColor: colors.background
  },
  imageContainer: {
    position: "relative",
    width: "100%"
  },
  mediaCountBadge: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10
  },
  mediaCountBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.white
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center"
  },
  placeholderText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  modalMediaContainer: {
    width: "100%",
    height: 200,
    backgroundColor: colors.background,
    borderRadius: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  modalMediaItem: {
    width: 320,
    height: 200,
    paddingHorizontal: spacing.sm
  },
  modalMedia: {
    width: "100%",
    height: "100%",
    borderRadius: spacing.xs
  },
  videoPlaceholder: {
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center"
  },
  videoIndicator: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.text
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    padding: spacing.lg,
    gap: spacing.sm
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.text
  },
  reportStatus: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark
  },
  detailText: {
    fontSize: typography.sizes.sm,
    color: colors.text
  },
  reasonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  reasonChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.background
  },
  reasonChipSelected: {
    borderColor: "#2D6A4F",
    backgroundColor: "#E9F8EE"
  },
  reasonChipText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: "600"
  },
  reasonChipTextSelected: {
    color: "#1C5D43"
  },
  drawerOverlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start"
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)"
  },
  drawerPanel: {
    width: "52%",
    maxWidth: 240,
    minHeight: "100%",
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.sm
  },
  drawerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text
  },
  drawerItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background
  },
  drawerItemText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: "600"
  }
});
