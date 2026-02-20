import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { TextField } from "../components/ui/TextField";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { colors, spacing, typography } from "../constants/theme";
import { submitProduct } from "../services/community";

export default function UploadProductScreen() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    productName: "",
    price: "",
    productImageUrl: "",
    sellerName: "",
    sellerEmail: "",
    city: ""
  });

  const handleSubmit = async () => {
    setMessage(null);

    if (
      !form.productName ||
      !form.price ||
      !form.productImageUrl ||
      !form.sellerName ||
      !form.sellerEmail ||
      !form.city
    ) {
      setMessage("Fill all fields");
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
        price: parsedPrice,
        productImageUrl: form.productImageUrl,
        sellerName: form.sellerName,
        sellerEmail: form.sellerEmail.toLowerCase(),
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
          label="Product Image URL"
          value={form.productImageUrl}
          onChangeText={(value) => setForm((prev) => ({ ...prev, productImageUrl: value }))}
          placeholder="https://..."
        />
        {form.productImageUrl ? (
          <Image source={{ uri: form.productImageUrl }} style={styles.preview} resizeMode="cover" />
        ) : null}
        <TextField
          label="Your Name"
          value={form.sellerName}
          onChangeText={(value) => setForm((prev) => ({ ...prev, sellerName: value }))}
        />
        <TextField
          label="Your Email"
          value={form.sellerEmail}
          keyboardType="email-address"
          onChangeText={(value) => setForm((prev) => ({ ...prev, sellerEmail: value }))}
        />
        <TextField
          label="Your City"
          value={form.city}
          onChangeText={(value) => setForm((prev) => ({ ...prev, city: value }))}
        />

        {message ? <Text style={styles.message}>{message}</Text> : null}
        <PrimaryButton label={loading ? "Uploading..." : "Submit Product"} onPress={handleSubmit} />
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    padding: spacing.lg
  },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: spacing.sm,
    backgroundColor: colors.background,
    marginBottom: spacing.md
  },
  message: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark,
    marginBottom: spacing.sm
  }
});
