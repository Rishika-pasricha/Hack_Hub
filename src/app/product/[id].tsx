import { useState, useLayoutEffect, useCallback, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Image,
  Modal,
  ActivityIndicator,
  Linking,
  Alert
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import { colors, spacing, typography, radii } from "../../constants/theme";
import { Product } from "../../types/community";
import { reportProduct, getProducts } from "../../services/community";
import { useAuth } from "../../context/AuthContext";
import { PrimaryButton } from "../../components/ui/PrimaryButton";

type ReportReason = "spam" | "fake" | "offensive" | "scam";

const reasonOptions: { label: string; value: ReportReason }[] = [
  { label: "Spam", value: "spam" },
  { label: "Fake Product", value: "fake" },
  { label: "Offensive", value: "offensive" },
  { label: "Scam", value: "scam" }
];

// Cache for products to avoid refetching on every navigation
let productsCache: Product[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

function isCacheValid() {
  return Date.now() - cacheTimestamp < CACHE_DURATION;
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const productId = params.id as string;

  // Define ALL hooks FIRST - before any early returns
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: "Product Details",
      headerBackTitle: ""
    });
  }, [navigation]);

  // Fetch product by ID
  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      let cachedProduct: Product | null = null;
      try {
        setLoading(true);
        
        // Show cached product instantly if available, then refresh from API.
        if (isCacheValid()) {
          cachedProduct = productsCache.find(p => p._id === productId) || null;
          if (cachedProduct) {
            setProduct(cachedProduct);
            setLoading(false);
          }
        }
        
        // Always fetch latest products to avoid stale details after edits.
        const products = await getProducts();
        productsCache = products;
        cacheTimestamp = Date.now();
        
        const found = products.find(p => p._id === productId);
        setProduct(found || cachedProduct || null);
      } catch (err) {
        console.error("Failed to fetch product:", err);
        setProduct(cachedProduct || null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const media = product?.productMedia && product.productMedia.length > 0 
    ? product.productMedia 
    : product?.productImageUrl 
    ? [{ mediaType: "image", mediaUrl: product.productImageUrl }]
    : [];

  const currentMedia = media[currentMediaIndex];
  
  // Call useVideoPlayer directly at top level (never conditionally)
  const videoPlayer = useVideoPlayer(currentMedia?.mediaUrl || "", player => {
    player.loop = false;
  });

  const handleNextMedia = useCallback(() => {
    setCurrentMediaIndex(prev => Math.min(prev + 1, media.length - 1));
  }, [media.length]);

  const handlePrevMedia = useCallback(() => {
    setCurrentMediaIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const handleEnquire = useCallback(async () => {
    if (!user?.email) {
      Alert.alert("Error", "Please log in to enquire");
      return;
    }

    const email = product?.sellerEmail;
    const subject = `Enquiry about ${product?.productName}`;
    const body = `Hi ${product?.sellerName},\n\nI'm interested in your product "${product?.productName}" priced at Rs. ${product?.price}.\n\nPlease let me know more details.\n\nThanks,\n${user.email}`;
    
    const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      await Linking.openURL(mailto);
    } catch (err) {
      Alert.alert("Error", "Could not open email app");
    }
  }, [product, user]);

  const handleReport = useCallback(async () => {
    if (!user?.email) {
      Alert.alert("Error", "Please log in to report");
      return;
    }

    if (!selectedReason) {
      Alert.alert("Error", "Please select a reason");
      return;
    }

    try {
      setReportLoading(true);
      const response = await reportProduct(product?._id || "", user.email, selectedReason);
      setMessage(response.message);
      setReportModalVisible(false);
      setSelectedReason(null);
      
      Alert.alert("Success", response.message, [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to report product");
    } finally {
      setReportLoading(false);
    }
  }, [product, user, selectedReason, router]);

  // NOW do the early returns after all hooks
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Product not found</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Media Carousel */}
        {media.length > 0 ? (
          <View style={styles.mediaContainer}>
            <View style={styles.mediaWrapper}>
              {currentMedia.mediaType === "image" ? (
                <Image
                  source={{ uri: currentMedia.mediaUrl }}
                  style={styles.media}
                  resizeMode="cover"
                />
              ) : currentMedia.mediaType === "video" && currentMedia.mediaUrl ? (
                <VideoView
                  player={videoPlayer}
                  style={styles.media}
                  contentFit="contain"
                  nativeControls
                />
              ) : null}
            </View>

            {/* Media Counter */}
            <View style={styles.mediaCounter}>
              <Text style={styles.mediaCounterText}>
                {currentMediaIndex + 1} / {media.length}
              </Text>
            </View>

            {/* Navigation Arrows */}
            {media.length > 1 && (
              <View style={styles.navigationContainer}>
                <Pressable
                  style={[styles.arrowButton, currentMediaIndex === 0 && styles.arrowButtonDisabled]}
                  onPress={handlePrevMedia}
                  disabled={currentMediaIndex === 0}
                >
                  <Text style={styles.arrowText}>‹</Text>
                </Pressable>
                <Pressable
                  style={[styles.arrowButton, currentMediaIndex === media.length - 1 && styles.arrowButtonDisabled]}
                  onPress={handleNextMedia}
                  disabled={currentMediaIndex === media.length - 1}
                >
                  <Text style={styles.arrowText}>›</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.media, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        {/* Product Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.titleSection}>
            <Text style={styles.productName}>{product.productName}</Text>
            <Text style={styles.price}>Rs. {product.price}</Text>
          </View>

          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Location</Text>
            <Text style={styles.infoText}>{product.city}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Seller</Text>
            <Text style={styles.infoText}>{product.sellerName}</Text>
            <Text style={styles.subText}>{product.sellerEmail}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={handleEnquire}
            >
              <Text style={styles.primaryButtonText}>Enquire</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setReportModalVisible(true)}
            >
              <Text style={styles.secondaryButtonText}>Report</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Product</Text>
            <Text style={styles.modalSubtitle}>Select the reason for reporting</Text>

            <View style={styles.reasonsList}>
              {reasonOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.reasonItem,
                    selectedReason === option.value && styles.reasonItemSelected
                  ]}
                  onPress={() => setSelectedReason(option.value)}
                >
                  <View style={styles.reasonCheckbox}>
                    {selectedReason === option.value && (
                      <View style={styles.reasonCheckboxInner} />
                    )}
                  </View>
                  <Text style={styles.reasonText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setReportModalVisible(false);
                  setSelectedReason(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalButton,
                  styles.submitButton,
                  (!selectedReason || reportLoading) && styles.submitButtonDisabled
                ]}
                onPress={handleReport}
                disabled={!selectedReason || reportLoading}
              >
                {reportLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                )}
              </Pressable>
            </View>
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  errorText: {
    fontSize: typography.body,
    color: colors.text,
    marginBottom: spacing.lg
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.text,
    marginTop: spacing.lg
  },
  backButton: {
    paddingVertical: spacing.sm
  },
  backButtonText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: "600"
  },
  scrollView: {
    flex: 1
  },
  content: {
    paddingBottom: spacing.xl
  },

  // Media Carousel
  mediaContainer: {
    position: "relative",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  mediaWrapper: {
    width: "100%",
    aspectRatio: 1
  },
  media: {
    width: "100%",
    height: "100%"
  },
  placeholderImage: {
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center"
  },
  placeholderText: {
    fontSize: typography.body,
    color: colors.textSecondary
  },

  // Media Counter & Navigation
  mediaCounter: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md
  },
  mediaCounterText: {
    color: "#fff",
    fontSize: typography.small,
    fontWeight: "600"
  },
  navigationContainer: {
    position: "absolute",
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  arrowButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    justifyContent: "center",
    alignItems: "center"
  },
  arrowButtonDisabled: {
    opacity: 0.3
  },
  arrowText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "300"
  },

  // Info Card
  infoCard: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  titleSection: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  productName: {
    fontSize: typography.subtitle,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm
  },
  price: {
    fontSize: typography.title,
    fontWeight: "700",
    color: colors.primary
  },

  // Sections
  section: {
    marginBottom: spacing.lg
  },
  sectionLabel: {
    fontSize: typography.label,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase"
  },
  infoText: {
    fontSize: typography.body,
    color: colors.text,
    marginBottom: spacing.xs
  },
  descriptionText: {
    fontSize: typography.body,
    color: colors.text,
    lineHeight: 22
  },
  subText: {
    fontSize: typography.label,
    color: colors.textSecondary,
    marginTop: spacing.xs
  },

  // Action Buttons
  actionsContainer: {
    marginTop: spacing.xl,
    flexDirection: "row",
    gap: spacing.md
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    justifyContent: "center",
    alignItems: "center"
  },
  primaryButton: {
    backgroundColor: colors.primary,
    flex: 2
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: typography.body,
    fontWeight: "600"
  },
  secondaryButton: {
    backgroundColor: colors.error,
    flex: 1
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: typography.body,
    fontWeight: "600"
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    maxHeight: "80%"
  },
  modalTitle: {
    fontSize: typography.subtitle,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm
  },
  modalSubtitle: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg
  },

  // Reasons List
  reasonsList: {
    marginBottom: spacing.lg
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background
  },
  reasonItemSelected: {
    backgroundColor: colors.info,
    opacity: 0.8
  },
  reasonCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.md,
    justifyContent: "center",
    alignItems: "center"
  },
  reasonCheckboxInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary
  },
  reasonText: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: "500"
  },

  // Modal Actions
  modalActions: {
    flexDirection: "row",
    gap: spacing.md
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    justifyContent: "center",
    alignItems: "center"
  },
  cancelButton: {
    backgroundColor: colors.border
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "600"
  },
  submitButton: {
    backgroundColor: colors.error
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: "#fff",
    fontSize: typography.body,
    fontWeight: "600"
  }
});
