import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { colors, spacing, typography } from "../constants/theme";
import { reportProduct, getProductById } from "../services/community";
import { Product } from "../types/community";
import { useAuth } from "../context/AuthContext";

export default function ProductDetailsScreen() {
  const REPORT_REASONS: Array<{ value: "spam" | "fake" | "offensive" | "scam"; label: string }> = [
    { value: "spam", label: "Spam" },
    { value: "fake", label: "Fake Listing" },
    { value: "offensive", label: "Offensive" },
    { value: "scam", label: "Scam" }
  ];

  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<"spam" | "fake" | "offensive" | "scam" | null>(
    null
  );
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setMessage("No product ID provided");
        return;
      }
      try {
        const found = await getProductById(id);
        console.log("=== Product Fetched ===");
        console.log("Product ID:", found._id);
        console.log("Product name:", found.productName);
        console.log("Product media:", found.productMedia);
        console.log("Product media length:", found.productMedia?.length);
        if (found.productMedia && found.productMedia.length > 0) {
          console.log("First media URL:", found.productMedia[0].mediaUrl.substring(0, 100) + "...");
        }
        console.log("Full product:", found);
        setProduct(found);
      } catch (err) {
        console.error("Error fetching product:", err);
        setMessage("Failed to load product details");
      }
    };
    fetchProduct();
  }, [id]);

  const handleEnquire = async () => {
    if (!product) {
      return;
    }

    const subject = `Ecofy Marketplace Enquiry: ${product.productName}`;
    const body =
      `Hi ${product.sellerName},\n\n` +
      `I found your listing "${product.productName}" on Ecofy and I am interested in buying it.\n\n` +
      `Could you please share more details about availability and pickup/delivery options?\n\n` +
      `Thanks,\n` +
      `Ecofy User`;

    const gmailUrl =
      `googlegmail://co?to=${encodeURIComponent(product.sellerEmail)}` +
      `&subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    const mailtoUrl =
      `mailto:${encodeURIComponent(product.sellerEmail)}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    try {
      const canOpenGmail = await Linking.canOpenURL(gmailUrl);
      await Linking.openURL(canOpenGmail ? gmailUrl : mailtoUrl);
    } catch (err: any) {
      setMessage(err.message || "Failed to open email app");
    }
  };

  const handleReportProduct = async () => {
    setReportStatus(null);
    if (!product || !user?.email) {
      const text = "Please login to report products";
      setMessage(text);
      setReportStatus(text);
      Alert.alert("Report Product", text);
      return;
    }

    if (product.sellerEmail.toLowerCase() === user.email.toLowerCase()) {
      const text = "You cannot report your own product";
      setMessage(text);
      setReportStatus(text);
      Alert.alert("Report Product", text);
      return;
    }
    if (!selectedReportReason) {
      const text = "Please select a report reason";
      setMessage(text);
      setReportStatus(text);
      Alert.alert("Report Product", text);
      return;
    }

    try {
      setReporting(true);
      const response = await reportProduct(product._id, user.email.toLowerCase(), selectedReportReason);
      const text = response.message || "Product reported";
      setMessage(text);
      setReportStatus(text);
      Alert.alert("Report Product", text);
      setSelectedReportReason(null);
    } catch (err: any) {
      const text = err.message || "Failed to report product";
      setMessage(text);
      setReportStatus(text);
      Alert.alert("Report Product", text);
    } finally {
      setReporting(false);
    }
  };

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{message || "Loading product details..."}</Text>
          <PrimaryButton label="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const mediaItems = product.productMedia || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
        </View>

        {/* Media Gallery */}
        <View style={styles.mediaContainer}>
          {mediaItems.length > 0 ? (
            <FlatList
              data={mediaItems}
              keyExtractor={(_, idx) => `media-${idx}`}
              horizontal
              pagingEnabled
              scrollEnabled={true}
              showsHorizontalScrollIndicator={true}
              scrollEventThrottle={16}
              renderItem={({ item }) => {
                const mediaItem = item as { mediaType: "image" | "video"; mediaUrl: string };
                const isBase64 = mediaItem.mediaUrl.startsWith("data:");
                console.log("Rendering media item:", {
                  isBase64,
                  urlLength: mediaItem.mediaUrl.length,
                  urlPreview: mediaItem.mediaUrl.substring(0, 100),
                  mediaType: mediaItem.mediaType
                });
                return (
                  <View style={styles.mediaItem}>
                    {mediaItem.mediaType === "image" ? (
                      <Image 
                        source={{ uri: mediaItem.mediaUrl }}
                        style={styles.media} 
                        resizeMode="contain"
                        onLoad={() => console.log("Image loaded successfully")}
                        onError={(error: any) => console.log("Image load error:", error, "URL:", mediaItem.mediaUrl)}
                      />
                    ) : (
                      <View style={[styles.media, styles.videoPlaceholder]}>
                        <Text style={styles.videoIndicator}>▶ Video</Text>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          ) : (
            <View style={[styles.media, styles.placeholderImage]}>
              <Text style={styles.placeholderText}>No Image Available</Text>
            </View>
          )}
          {mediaItems.length > 1 && (
            <View style={styles.mediaIndicator}>
              <Text style={styles.mediaIndicatorText}>{mediaItems.length} items</Text>
            </View>
          )}
        </View>

        {/* Product Details */}
        <View style={styles.detailsContainer}>
          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>Rs. {product.price}</Text>
          </View>

          {/* Product Name */}
          <Text style={styles.productName}>{product.productName}</Text>

          {/* Description */}
          {product.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {/* City */}
          <View style={styles.cityContainer}>
            <Text style={styles.sectionLabel}>Location</Text>
            <Text style={styles.city}>{product.city}</Text>
          </View>

          {/* Seller Info */}
          <View style={styles.sellerContainer}>
            <Text style={styles.sectionLabel}>Seller</Text>
            <Text style={styles.sellerName}>{product.sellerName}</Text>
            <Text style={styles.sellerEmail}>{product.sellerEmail}</Text>
          </View>

          {/* Report Status */}
          {reportStatus && <Text style={styles.reportStatus}>{reportStatus}</Text>}

          {/* Enquire Button */}
          <PrimaryButton label="Enquire with Seller" onPress={handleEnquire} />

          {/* Report Section */}
          <View style={styles.reportSection}>
            <Text style={styles.sectionLabel}>Report Product</Text>
            <Text style={styles.reportHint}>Report Count: {product.reportCount || 0}/5</Text>
            
            <Text style={styles.reasonLabel}>Select reason:</Text>
            <View style={styles.reasonRow}>
              {REPORT_REASONS.map((reason) => (
                <Pressable
                  key={reason.value}
                  style={[
                    styles.reasonChip,
                    selectedReportReason === reason.value ? styles.reasonChipSelected : null
                  ]}
                  onPress={() => setSelectedReportReason(reason.value)}
                >
                  <Text
                    style={[
                      styles.reasonChipText,
                      selectedReportReason === reason.value ? styles.reasonChipTextSelected : null
                    ]}
                  >
                    {reason.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton
              label={reporting ? "Reporting..." : "Submit Report"}
              onPress={handleReportProduct}
              disabled={reporting}
            />
          </View>

          {message && <Text style={styles.infoMessage}>{message}</Text>}
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm
  },
  backButtonText: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: "700"
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl
  },
  errorText: {
    fontSize: typography.sizes.md,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: "center"
  },
  mediaContainer: {
    width: "100%",
    height: 300,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: "relative"
  },
  mediaItem: {
    width: "100%",
    height: 300
  },
  media: {
    width: "100%",
    height: "100%"
  },
  videoPlaceholder: {
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center"
  },
  videoIndicator: {
    fontSize: typography.sizes.xxxl,
    fontWeight: "700" as const,
    color: colors.text
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background
  },
  placeholderText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary
  },
  mediaIndicator: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm
  },
  mediaIndicatorText: {
    fontSize: typography.sizes.sm,
    color: colors.surface,
    fontWeight: "600"
  },
  detailsContainer: {
    padding: spacing.lg,
    gap: spacing.lg
  },
  priceContainer: {
    alignItems: "flex-start"
  },
  price: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: colors.primary
  },
  productName: {
    fontSize: typography.sizes.xl,
    fontWeight: "700" as const,
    color: colors.text
  },
  descriptionContainer: {
    gap: spacing.sm
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "700" as const,
    color: colors.textSecondary,
    textTransform: "uppercase"
  },
  description: {
    fontSize: typography.sizes.md,
    color: colors.text,
    lineHeight: 22
  },
  cityContainer: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md
  },
  city: {
    fontSize: typography.sizes.md,
    color: colors.text,
    fontWeight: "600" as const
  },
  sellerContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    padding: spacing.md,
    gap: spacing.xs
  },
  sellerName: {
    fontSize: typography.sizes.md,
    fontWeight: "600" as const,
    color: colors.text
  },
  sellerEmail: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  reportStatus: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: "600" as const
  },
  reportSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
    gap: spacing.md
  },
  reportHint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  reasonLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: "600" as const
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
    fontWeight: "600" as const
  },
  reasonChipTextSelected: {
    color: "#1C5D43"
  },
  infoMessage: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    textAlign: "center",
    paddingVertical: spacing.md
  }
});
