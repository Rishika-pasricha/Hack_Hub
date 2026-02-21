import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextField } from "../components/ui/TextField";
import { colors, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { deleteProduct, getMyProducts, updateProduct } from "../services/community";
import { Product } from "../types/community";
import * as ImagePicker from "expo-image-picker";

type EditForm = {
  productName: string;
  description: string;
  price: string;
  city: string;
  productImageData: string;
  imagePreviewUri: string;
};

export default function MyProductsScreen() {
  const router = useRouter();
  const { focusProductId } = useLocalSearchParams<{ focusProductId?: string }>();
  const { user, isHydrated } = useAuth();
  const listRef = useRef<FlatList<Product> | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    productName: "",
    description: "",
    price: "",
    city: "",
    productImageData: "",
    imagePreviewUri: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/login");
    }
  }, [isHydrated, user]);

  const loadMyProducts = async () => {
    if (!user?.email) {
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      const data = await getMyProducts(user.email.toLowerCase());
      setProducts(data);
    } catch (err: any) {
      setMessage(err.message || "Failed to load your products");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMyProducts();
    }, [user?.email])
  );

  useEffect(() => {
    if (!focusProductId || products.length === 0) {
      return;
    }
    const targetIndex = products.findIndex((product) => product._id === String(focusProductId));
    if (targetIndex >= 0) {
      setTimeout(() => {
        listRef.current?.scrollToIndex?.({ index: targetIndex, animated: true });
      }, 120);
    }
  }, [focusProductId, products]);

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      productName: product.productName,
      description: product.description || "",
      price: String(product.price),
      city: product.city,
      productImageData: "",
      imagePreviewUri: product.productImageUrl
    });
  };

  const pickEditImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage("Gallery permission is required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
      base64: true
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      setMessage("Could not read selected image");
      return;
    }

    const mimeType = asset.mimeType || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${asset.base64}`;
    setEditForm((prev) => ({
      ...prev,
      productImageData: dataUrl,
      imagePreviewUri: asset.uri
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingProduct || !user?.email) {
      return;
    }
    if (!editForm.productName.trim() || !editForm.price.trim() || !editForm.city.trim()) {
      setMessage("Product name, price, and city are required");
      return;
    }
    const parsedPrice = Number(editForm.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setMessage("Enter a valid positive price");
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      await updateProduct(editingProduct._id, {
        sellerEmail: user.email.toLowerCase(),
        productName: editForm.productName.trim(),
        description: editForm.description.trim() || undefined,
        price: parsedPrice,
        city: editForm.city.trim(),
        productImageUrl: editForm.productImageData || undefined
      });
      setEditingProduct(null);
      await loadMyProducts();
      setMessage("Product updated successfully");
    } catch (err: any) {
      setMessage(err.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (product: Product) => {
    if (!user?.email) {
      return;
    }
    Alert.alert("Delete Product", "Are you sure you want to delete this product?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setMessage(null);
            await deleteProduct(product._id, user.email.toLowerCase());
            await loadMyProducts();
            setMessage("Product deleted successfully");
          } catch (err: any) {
            setMessage(err.message || "Failed to delete product");
          }
        }
      }
    ]);
  };

  if (!isHydrated || !user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Products</Text>
          <Text style={styles.subtitle}>Manage products uploaded from your account.</Text>
          <PrimaryButton label="Upload New Product" onPress={() => router.push("/upload-product")} />
          {message ? <Text style={styles.info}>{message}</Text> : null}
        </View>

        <FlatList
          ref={(ref) => {
            listRef.current = ref;
          }}
          data={products}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.content}
          refreshing={loading}
          onRefresh={loadMyProducts}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {loading ? "Loading your products..." : "No products uploaded from this account yet."}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, String(focusProductId || "") === item._id ? styles.focusedCard : null]}>
              <Image source={{ uri: item.productImageUrl }} style={styles.cardImage} resizeMode="cover" />
              <Text style={styles.cardTitle}>{item.productName}</Text>
              {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}
              <Text style={styles.cardMeta}>Price: Rs. {item.price}</Text>
              <Text style={styles.cardMeta}>City: {item.city}</Text>
              <Text style={styles.cardMeta}>Reports: {item.reportCount || 0}/5</Text>
              <View style={styles.actionsRow}>
                <PrimaryButton label="Edit" onPress={() => startEdit(item)} />
                <PrimaryButton label="Delete" onPress={() => handleDelete(item)} />
              </View>
            </View>
          )}
        />

        <Modal visible={!!editingProduct} transparent animationType="fade" onRequestClose={() => setEditingProduct(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <ScrollView>
                <Text style={styles.modalTitle}>Edit Product</Text>
                <PrimaryButton label="Replace Product Image" onPress={pickEditImageFromGallery} />
                {editForm.imagePreviewUri ? (
                  <Image source={{ uri: editForm.imagePreviewUri }} style={styles.editPreview} resizeMode="cover" />
                ) : null}
                <TextField
                  label="Product Name"
                  value={editForm.productName}
                  onChangeText={(value) => setEditForm((prev) => ({ ...prev, productName: value }))}
                />
                <TextField
                  label="Description (Optional)"
                  value={editForm.description}
                  onChangeText={(value) => setEditForm((prev) => ({ ...prev, description: value }))}
                />
                <TextField
                  label="Price"
                  value={editForm.price}
                  keyboardType="numeric"
                  onChangeText={(value) => setEditForm((prev) => ({ ...prev, price: value }))}
                />
                <TextField
                  label="City"
                  value={editForm.city}
                  onChangeText={(value) => setEditForm((prev) => ({ ...prev, city: value }))}
                />
                <View style={styles.modalActions}>
                  <PrimaryButton label="Cancel" onPress={() => setEditingProduct(null)} disabled={saving} />
                  <PrimaryButton label={saving ? "Saving..." : "Save Changes"} onPress={handleSaveEdit} disabled={saving} />
                </View>
              </ScrollView>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm
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
  info: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.sm,
    padding: spacing.md,
    gap: spacing.xs
  },
  focusedCard: {
    borderColor: "#2D6A4F",
    borderWidth: 2
  },
  cardImage: {
    width: "100%",
    height: 140,
    borderRadius: spacing.xs,
    backgroundColor: colors.background,
    marginBottom: spacing.xs
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text
  },
  cardDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text
  },
  cardMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  actionsRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg
  },
  modalCard: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    padding: spacing.lg
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm
  },
  editPreview: {
    width: "100%",
    height: 160,
    borderRadius: spacing.sm,
    backgroundColor: colors.background,
    marginBottom: spacing.sm
  },
  modalActions: {
    marginTop: spacing.sm,
    gap: spacing.sm
  }
});
