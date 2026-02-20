import { useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { colors, spacing, typography } from "../../constants/theme";
import { getProducts } from "../../services/community";
import { Product } from "../../types/community";
import { useFocusEffect, useRouter } from "expo-router";

export default function ShopTab() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (err: any) {
      setMessage(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(() => {
    loadProducts();
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProducts} />}
    >
      <Text style={styles.title}>Best Out Of Waste Shop</Text>
      <Text style={styles.subtitle}>Buy and sell upcycled products.</Text>
      <PrimaryButton label="Upload Product" onPress={() => router.push("/upload-product")} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Marketplace Products</Text>
        {message ? <Text style={styles.info}>{message}</Text> : null}
        {products.length === 0 ? <Text style={styles.cardText}>No products uploaded yet.</Text> : null}
        {products.map((product) => (
          <Pressable
            key={product._id}
            onPress={() => setExpandedId((prev) => (prev === product._id ? null : product._id))}
            style={styles.productCard}
          >
            <Text style={styles.productTitle}>{product.productName}</Text>
            <Text style={styles.productPrice}>Rs. {product.price}</Text>
            <Image
              source={{ uri: product.productImageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
            {expandedId === product._id ? (
              <View style={styles.detailBox}>
                <Text style={styles.detailText}>Seller Email: {product.sellerEmail}</Text>
                <Text style={styles.detailText}>City: {product.city}</Text>
              </View>
            ) : (
              <Text style={styles.tapHint}>Tap to view seller details</Text>
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
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
  cardText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  info: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark
  },
  productCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.background,
    gap: spacing.xs
  },
  productTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text
  },
  productPrice: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark
  },
  tapHint: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary
  },
  productImage: {
    width: "100%",
    height: 140,
    borderRadius: spacing.sm,
    backgroundColor: colors.surface
  },
  detailBox: {
    marginTop: spacing.xs,
    gap: spacing.xs
  },
  detailText: {
    fontSize: typography.sizes.sm,
    color: colors.text
  }
});
