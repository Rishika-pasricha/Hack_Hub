import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextField } from "../components/ui/TextField";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { colors, spacing, typography } from "../constants/theme";
import { submitProduct } from "../services/community";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";

export default function UploadProductScreen() {
  const router = useRouter();
  const { user, fullName, isHydrated } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imagePreviewUri, setImagePreviewUri] = useState("");
  const [form, setForm] = useState({
    productName: "",
    price: "",
    productImageData: "",
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

  const pickImageFromGallery = async () => {
    setMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage("Gallery permission is required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      setMessage("Could not read image data");
      return;
    }

    const mimeType = asset.mimeType || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${asset.base64}`;
    setImagePreviewUri(asset.uri);
    setForm((prev) => ({ ...prev, productImageData: dataUrl }));
  };

  const handleSubmit = async () => {
    setMessage(null);

    if (
      !form.productName ||
      !form.price ||
      !form.productImageData ||
      !fullName ||
      !user?.email ||
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
        productImageUrl: form.productImageData,
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
        <PrimaryButton label="Pick Image From Gallery" onPress={pickImageFromGallery} />
        {imagePreviewUri ? <Image source={{ uri: imagePreviewUri }} style={styles.preview} resizeMode="cover" /> : null}
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
  },
  identity: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm
  }
});
