import { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { colors, spacing, typography } from "../../constants/theme";
import { getProducts } from "../../services/community";
import { Product } from "../../types/community";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ShopTab() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err: any) {
      setMessage(err.message || "Failed to load products");
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProducts();
      const interval = setInterval(loadProducts, 20000);
      return () => clearInterval(interval);
    }, [])
  );

  const handleEnquire = async () => {
    if (!selectedProduct) {
      return;
    }

    const subject = `Ecofy Marketplace Enquiry: ${selectedProduct.productName}`;
    const body =
      `Hi ${selectedProduct.sellerName},\n\n` +
      `I found your listing "${selectedProduct.productName}" on Ecofy and I am interested in buying it.\n\n` +
      `Could you please share more details about availability and pickup/delivery options?\n\n` +
      `Thanks,\n` +
      `Ecofy User`;

    const gmailUrl =
      `googlegmail://co?to=${encodeURIComponent(selectedProduct.sellerEmail)}` +
      `&subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    const mailtoUrl =
      `mailto:${encodeURIComponent(selectedProduct.sellerEmail)}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    try {
      const canOpenGmail = await Linking.canOpenURL(gmailUrl);
      await Linking.openURL(canOpenGmail ? gmailUrl : mailtoUrl);
    } catch (err: any) {
      setMessage(err.message || "Failed to open email app");
    }
  };

  const renderHeader = () => (
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
  );

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
        renderItem={({ item }) => (
          <Pressable style={styles.productCard} onPress={() => setSelectedProduct(item)}>
            <Image source={{ uri: item.productImageUrl }} style={styles.productImage} resizeMode="cover" />
            <Text style={styles.productTitle} numberOfLines={2}>
              {item.productName}
            </Text>
            <Text style={styles.productPrice}>Rs. {item.price}</Text>
            <Text style={styles.tapHint}>Tap for seller details</Text>
          </Pressable>
        )}
      />

      <Modal visible={!!selectedProduct} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedProduct?.productName}</Text>
            {selectedProduct?.description ? (
              <Text style={styles.detailText}>Description: {selectedProduct.description}</Text>
            ) : null}
            <Text style={styles.detailText}>Price: Rs. {selectedProduct?.price}</Text>
            <PrimaryButton label="Enquire" onPress={handleEnquire} />
            <Text style={styles.detailText}>City: {selectedProduct?.city}</Text>
            <PrimaryButton label="Close" onPress={() => setSelectedProduct(null)} />
          </View>
        </View>
      </Modal>

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
                router.push("/my-products");
              }}
            >
              <Text style={styles.drawerItemText}>My Products</Text>
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
    overflow: "hidden"
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
  detailText: {
    fontSize: typography.sizes.sm,
    color: colors.text
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
