import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, typography } from "../../constants/theme";
import { PrimaryButton } from "./PrimaryButton";

export interface MediaItem {
  mediaType: "image" | "video";
  mediaUrl: string;
  previewUri: string;
}

interface MultiMediaPickerProps {
  maxItems?: number;
  mediaItems: MediaItem[];
  onMediaChange: (items: MediaItem[]) => void;
  onError?: (error: string) => void;
}

export const MultiMediaPicker = ({
  maxItems = 4,
  mediaItems,
  onMediaChange,
  onError
}: MultiMediaPickerProps) => {
  const [loading, setLoading] = useState(false);

  const readUriAsDataUrl = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read selected media"));
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(blob);
    });
  };

  const addMediaFromGallery = async () => {
    if (mediaItems.length >= maxItems) {
      onError?.(`You can attach up to ${maxItems} media items`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onError?.("Gallery permission is required");
      return;
    }

    try {
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: false,
        quality: 0.7,
        base64: true
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const mediaType = asset.type === "video" ? "video" : "image";
      let mediaUrl = "";
      
      if (asset.base64 && mediaType === "image") {
        const mimeType = asset.mimeType || "image/jpeg";
        mediaUrl = `data:${mimeType};base64,${asset.base64}`;
      } else {
        mediaUrl = await readUriAsDataUrl(asset.uri);
      }

      if (!mediaUrl.startsWith("data:")) {
        onError?.("Could not read selected media");
        return;
      }

      onMediaChange([...mediaItems, { mediaType, mediaUrl, previewUri: asset.uri }]);
    } catch (err: any) {
      onError?.(err.message || "Failed to attach media");
    } finally {
      setLoading(false);
    }
  };

  const addMediaFromCamera = async () => {
    if (mediaItems.length >= maxItems) {
      onError?.(`You can attach up to ${maxItems} media items`);
      return;
    }

    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      onError?.("Camera permission is required");
      return;
    }

    try {
      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images", "videos"],
        allowsEditing: false,
        quality: 0.7,
        base64: true
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const mediaType = asset.type === "video" ? "video" : "image";
      let mediaUrl = "";
      
      if (asset.base64 && mediaType === "image") {
        const mimeType = asset.mimeType || "image/jpeg";
        mediaUrl = `data:${mimeType};base64,${asset.base64}`;
      } else {
        mediaUrl = await readUriAsDataUrl(asset.uri);
      }

      if (!mediaUrl.startsWith("data:")) {
        onError?.("Could not read selected media");
        return;
      }

      onMediaChange([...mediaItems, { mediaType, mediaUrl, previewUri: asset.uri }]);
    } catch (err: any) {
      onError?.(err.message || "Failed to attach media");
    } finally {
      setLoading(false);
    }
  };

  const removeMedia = (index: number) => {
    onMediaChange(mediaItems.filter((_, i) => i !== index));
  };

  return (
    <View>
      <View style={styles.buttonContainer}>
        <PrimaryButton
          label={loading ? "Loading..." : "Gallery"}
          onPress={addMediaFromGallery}
          disabled={loading || mediaItems.length >= maxItems}
        />
        <PrimaryButton
          label={loading ? "Loading..." : "Camera"}
          onPress={addMediaFromCamera}
          disabled={loading || mediaItems.length >= maxItems}
        />
      </View>

      {mediaItems.length > 0 && (
        <View style={styles.mediaList}>
          <Text style={styles.mediaLabel}>
            Attached Media ({mediaItems.length}/{maxItems})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
            {mediaItems.map((item, index) => (
              <View key={`${item.previewUri}-${index}`} style={styles.mediaItem}>
                {item.mediaType === "image" ? (
                  <Image
                    source={{ uri: item.previewUri }}
                    style={styles.mediaPreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Text style={styles.videoText}>▶</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeMedia(index)}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md
  },
  mediaList: {
    marginBottom: spacing.lg
  },
  mediaLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: spacing.sm
  },
  mediaScroll: {
    marginBottom: spacing.md
  },
  mediaItem: {
    marginRight: spacing.md,
    alignItems: "center"
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  videoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: spacing.sm,
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  videoText: {
    fontSize: 32,
    color: colors.text
  },
  removeBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "center"
  },
  removeBtnText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "bold"
  }
});
