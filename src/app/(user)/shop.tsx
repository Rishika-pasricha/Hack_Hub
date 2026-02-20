import { useCallback, useState } from "react";
import {
  FlatList,
  Image,
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

export default function ShopTab() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Best Out Of Waste Shop</Text>
      <Text style={styles.subtitle}>Buy and sell upcycled products.</Text>
      <PrimaryButton label="Upload Product" onPress={() => router.push("/upload-product")} />
      {message ? <Text style={styles.info}>{message}</Text> : null}
      {products.length === 0 ? <Text style={styles.cardText}>No products uploaded yet.</Text> : null}
    </View>
  );

  return (
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
            <Text style={styles.detailText}>Price: Rs. {selectedProduct?.price}</Text>
            <Text style={styles.detailText}>Seller Email: {selectedProduct?.sellerEmail}</Text>
            <Text style={styles.detailText}>City: {selectedProduct?.city}</Text>
            <PrimaryButton label="Close" onPress={() => setSelectedProduct(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { paddingBottom: spacing.lg, gap: spacing.sm },
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
  }
});
