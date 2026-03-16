import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextField } from "../components/ui/TextField";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { MultiMediaPicker, type MediaItem } from "../components/ui/MultiMediaPicker";
import { colors, spacing, typography } from "../constants/theme";
import { submitProduct } from "../services/community";
import { useAuth } from "../context/AuthContext";

export default function UploadProductScreen() {
  const router = useRouter();
  const { user, fullName, isHydrated } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [form, setForm] = useState({
    productName: "",
    description: "",
    price: "",
    city: ""
  });

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/login");
    }
  }, [user, isHydrated]);

  if (!isHydrated || !user) {
    return null;
  }

  const handleSubmit = async () => {
    setMessage(null);

    if (!form.productName || !form.price || !fullName || !user?.email || !form.city) {
      setMessage("Fill all required fields");
      return;
    }

    if (mediaItems.length === 0) {
      setMessage("At least one image or video is required");
      return;
    }

    const parsedPrice = Number(form.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setMessage("Enter a valid positive price");
      return;
    }

    try {
      setLoading(true);
      await submitProduct({
        productName: form.productName,
        description: form.description.trim() || undefined,
        price: parsedPrice,
        productMedia: mediaItems.map(item => ({
          mediaType: item.mediaType,
          mediaUrl: item.mediaUrl
        })),
        sellerName: fullName,
        sellerEmail: user.email.toLowerCase(),
        city: form.city
      });
      setMessage("Product uploaded successfully");
      setTimeout(() => router.back(), 700);
    } catch (err: any) {
      setMessage(err.message || "Failed to upload product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Upload Product</Text>
        <Text style={styles.subtitle}>Submit your upcycled item to the shared marketplace.</Text>

        <View style={styles.card}>
          <TextField
            label="Product Name"
            value={form.productName}
            onChangeText={(value) => setForm((prev) => ({ ...prev, productName: value }))}
          />
          <TextField
            label="Price"
            value={form.price}
            keyboardType="numeric"
            onChangeText={(value) => setForm((prev) => ({ ...prev, price: value }))}
          />
          <TextField
            label="Description (Optional)"
            value={form.description}
            onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
            placeholder="Add product details"
          />
          
          <Text style={styles.mediaLabel}>Add Images/Videos (1-4)</Text>
          <MultiMediaPicker
            maxItems={4}
            mediaItems={mediaItems}
            onMediaChange={setMediaItems}
            onError={setMessage}
          />

          <Text style={styles.identity}>
            Seller: {fullName || "Unknown User"} ({user?.email || "No email"})
          </Text>
          <TextField
            label="Your City"
            value={form.city}
            onChangeText={(value) => setForm((prev) => ({ ...prev, city: value }))}
          />

          {message ? <Text style={styles.message}>{message}</Text> : null}
          <PrimaryButton label={loading ? "Uploading..." : "Submit Product"} onPress={handleSubmit} />
        </View>
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    padding: spacing.lg
  },
  mediaLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm
  },
  message: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark,
    marginBottom: spacing.sm
  },
  identity: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm
  }
});
