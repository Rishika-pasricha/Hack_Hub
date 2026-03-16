import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextField } from "../components/ui/TextField";
import { colors, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { getMyProducts, deleteProduct, updateProduct } from "../services/community";
import { Product } from "../types/community";
import * as ImagePicker from "expo-image-picker";

export default function MyProductsScreen() {
  const router = useRouter();
  const { user, isHydrated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    productName: "",
    description: "",
    price: "",
    city: "",
    imageUri: ""
  });
  const [saving, setSaving] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/login");
    }
  }, [isHydrated, user]);

  const loadProducts = useCallback(async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      setMessage(null);
      const data = await getMyProducts(user.email);
      setProducts(data || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Load products when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const startEdit = (product: Product) => {
    const imageUrl = product.productMedia?.[0]?.mediaUrl || product.productImageUrl || "";
    setEditingProduct(product);
    setEditForm({
      productName: product.productName,
      description: product.description || "",
      price: String(product.price),
      city: product.city,
      imageUri: imageUrl
    });
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage("Photo library access required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
      base64: true
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        const mimeType = asset.mimeType || "image/jpeg";
        const dataUrl = `data:${mimeType};base64,${asset.base64}`;
        setEditForm((prev) => ({ ...prev, imageUri: dataUrl }));
      }
    }
  };

  const saveEdit = async () => {
    if (!editingProduct || !user?.email) return;

    const name = editForm.productName.trim();
    const price = Number(editForm.price);
    const city = editForm.city.trim();

    if (!name || !city || !Number.isFinite(price) || price <= 0) {
      setMessage("Please fill all fields with valid values");
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      await updateProduct(editingProduct._id, {
        sellerEmail: user.email,
        productName: name,
        description: editForm.description.trim() || undefined,
        price,
        city,
        productImageUrl: editForm.imageUri.startsWith("data:") ? editForm.imageUri : undefined
      });
      setEditingProduct(null);
      await loadProducts();
      setMessage("Product updated successfully");
    } catch (error: any) {
      setMessage(error.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (product: Product) => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${product.productName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (!user?.email) return;
              await deleteProduct(product._id, user.email);
              await loadProducts();
              setMessage("Product deleted successfully");
            } catch (error: any) {
              setMessage(error.message || "Failed to delete product");
            }
          }
        }
      ]
    );
  };

  if (!isHydrated || !user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Products</Text>
        <Text style={styles.subtitle}>Manage your marketplace listings</Text>
        <PrimaryButton
          label="Upload New Product"
          onPress={() => router.push("/upload-product")}
        />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>

      {/* Products List */}
      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No products yet</Text>
          <Text style={styles.emptySubtext}>Start by uploading your first product</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <Image
                source={{
                  uri: item.productMedia?.[0]?.mediaUrl || item.productImageUrl || ""
                }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.productName}
                </Text>
                {item.description && (
                  <Text style={styles.productDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                <Text style={styles.productPrice}>Rs. {item.price}</Text>
                <Text style={styles.productCity}>{item.city}</Text>
                <View style={styles.buttonRow}>
                  <PrimaryButton
                    label="Edit"
                    onPress={() => startEdit(item)}
                  />
                  <PrimaryButton
                    label="Delete"
                    onPress={() => confirmDelete(item)}
                  />
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={!!editingProduct}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Product</Text>

            {editForm.imageUri && (
              <Image
                source={{ uri: editForm.imageUri }}
                style={styles.previewImage}
              />
            )}

            <PrimaryButton label="Change Image" onPress={pickImage} />

            <TextField
              label="Product Name"
              value={editForm.productName}
              onChangeText={(val) =>
                setEditForm((p) => ({ ...p, productName: val }))
              }
            />

            <TextField
              label="Description (Optional)"
              value={editForm.description}
              onChangeText={(val) =>
                setEditForm((p) => ({ ...p, description: val }))
              }
              placeholder="Add details..."
            />

            <TextField
              label="Price (Rs.)"
              value={editForm.price}
              keyboardType="numeric"
              onChangeText={(val) =>
                setEditForm((p) => ({ ...p, price: val }))
              }
            />

            <TextField
              label="City"
              value={editForm.city}
              onChangeText={(val) => setEditForm((p) => ({ ...p, city: val }))}
            />

            <View style={styles.modalButtons}>
              <PrimaryButton
                label="Cancel"
                onPress={() => setEditingProduct(null)}
                disabled={saving}
              />
              <PrimaryButton
                label={saving ? "Saving..." : "Save"}
                onPress={saveEdit}
                disabled={saving}
              />
            </View>
          </ScrollView>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md
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
    color: colors.primary,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: spacing.sm
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  emptyText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm
  },
  emptySubtext: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  productImage: {
    width: 100,
    height: 120,
    backgroundColor: colors.background
  },
  productInfo: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs
  },
  productName: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text
  },
  productDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary
  },
  productPrice: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.primary
  },
  productCity: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary
  },
  buttonRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    gap: spacing.xs
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center"
  },
  modalContent: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xl,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    maxHeight: "80%"
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.lg
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.background
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg
  }
});
