import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextField } from "../components/ui/TextField";
import { colors, spacing, typography } from "../constants/theme";
import { getMunicipalityByArea, submitIssue } from "../services/community";
import { MunicipalityInfo } from "../types/community";
import { useAuth } from "../context/AuthContext";

type IssueMedia = {
  mediaType: "image" | "video";
  mediaUrl: string;
  previewUri: string;
};

export default function SubmitIssueScreen() {
  const router = useRouter();
  const { user, fullName } = useAuth();
  const [municipality, setMunicipality] = useState<MunicipalityInfo | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<IssueMedia[]>([]);
  const [form, setForm] = useState({
    subject: "",
    description: ""
  });

  const loadMunicipality = async () => {
    const area = user?.area?.trim() || String((user as any)?.district || "").trim();
    if (!area) {
      setMessage("Area is missing in your profile. Please register again with a valid area.");
      return;
    }

    try {
      const result = await getMunicipalityByArea(area);
      setMunicipality(result);
    } catch (err: any) {
      setMessage(err.message || "Failed to detect your municipality");
    }
  };

  useEffect(() => {
    loadMunicipality();
  }, [user?.area]);

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

  const pickMediaFromGallery = async () => {
    setMessage(null);

    if (mediaItems.length >= 4) {
      setMessage("You can attach up to 4 media items");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage("Gallery permission is required");
      return;
    }

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
    try {
      let mediaUrl = "";
      if (asset.base64 && mediaType === "image") {
        const mimeType = asset.mimeType || "image/jpeg";
        mediaUrl = `data:${mimeType};base64,${asset.base64}`;
      } else {
        mediaUrl = await readUriAsDataUrl(asset.uri);
      }

      if (!mediaUrl.startsWith("data:")) {
        setMessage("Could not read selected media");
        return;
      }

      setMediaItems((prev) => [...prev, { mediaType, mediaUrl, previewUri: asset.uri }]);
    } catch (err: any) {
      setMessage(err.message || "Failed to attach media");
    }
  };

  const takePhotoOrVideo = async () => {
    setMessage(null);

    if (mediaItems.length >= 4) {
      setMessage("You can attach up to 4 media items");
      return;
    }

    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      setMessage("Camera permission is required");
      return;
    }

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
    try {
      let mediaUrl = "";
      if (asset.base64 && mediaType === "image") {
        const mimeType = asset.mimeType || "image/jpeg";
        mediaUrl = `data:${mimeType};base64,${asset.base64}`;
      } else {
        mediaUrl = await readUriAsDataUrl(asset.uri);
      }

      if (!mediaUrl.startsWith("data:")) {
        setMessage("Could not read selected media");
        return;
      }

      setMediaItems((prev) => [...prev, { mediaType, mediaUrl, previewUri: asset.uri }]);
    } catch (err: any) {
      setMessage(err.message || "Failed to attach media");
    }
  };

  useEffect(() => {
    loadMunicipality();
  }, [user?.area]);

  const handleSubmit = async () => {
    setMessage(null);
    if (!user?.email || !fullName) {
      setMessage("Please login first");
      router.replace("/login");
      return;
    }

    if (!municipality?.contactEmail) {
      setMessage("Municipality mapping not available. Please try again.");
      return;
    }

    if (!form.subject.trim() || !form.description.trim()) {
      setMessage("Subject and description are required");
      return;
    }

    if (mediaItems.length === 0) {
      setMessage("At least one image or video is required");
      return;
    }

    try {
      setWorking(true);
      await submitIssue({
        userName: fullName,
        userEmail: user.email.toLowerCase(),
        subject: form.subject.trim(),
        description: form.description.trim(),
        municipalityEmail: municipality.contactEmail,
        media: mediaItems.map((item) => ({
          mediaType: item.mediaType,
          mediaUrl: item.mediaUrl
        }))
      });
      setForm({ subject: "", description: "" });
      setMediaItems([]);
      setMessage("Issue submitted successfully");
      router.replace("/issues");
    } catch (err: any) {
      setMessage(err.message || "Failed to submit issue");
    } finally {
      setWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Submit Civic Issue</Text>
        <Text style={styles.hint}>Submitting as: {fullName || "Unknown User"} ({user?.email || "No email"})</Text>
        <Text style={styles.hint}>Municipality: {municipality?.municipalityName || "Loading..."}</Text>
        <TextField
          label="Subject"
          value={form.subject}
          onChangeText={(value) => setForm((prev) => ({ ...prev, subject: value }))}
        />
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          multiline
          value={form.description}
          onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
          placeholder="Describe the issue in detail"
          placeholderTextColor={colors.muted}
        />

        <PrimaryButton label="Pick Image/Video From Gallery" onPress={pickMediaFromGallery} />
        <PrimaryButton label="Take Photo/Video With Camera" onPress={takePhotoOrVideo} />
        {mediaItems.length > 0 ? (
          <View style={styles.mediaList}>
            <Text style={styles.mediaLabel}>Attached Media ({mediaItems.length}/4)</Text>
            {mediaItems.map((item, index) => (
              <View key={`${item.previewUri}-${index}`} style={styles.mediaItem}>
                {item.mediaType === "image" ? (
                  <Image source={{ uri: item.previewUri }} style={styles.mediaPreview} resizeMode="cover" />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Text style={styles.videoText}>Video Attached</Text>
                  </View>
                )}
                <PrimaryButton
                  label="Remove"
                  onPress={() =>
                    setMediaItems((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
                  }
                />
              </View>
            ))}
          </View>
        ) : null}

        {message ? <Text style={styles.info}>{message}</Text> : null}
        <PrimaryButton label={working ? "Submitting..." : "Submit Issue"} onPress={handleSubmit} disabled={working} />
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
    gap: spacing.sm
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.text
  },
  hint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginTop: spacing.sm
  },
  textArea: {
    minHeight: 130,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    color: colors.text,
    textAlignVertical: "top"
  },
  info: {
    color: colors.primaryDark,
    fontSize: typography.sizes.sm
  },
  mediaList: {
    gap: spacing.md,
    marginTop: spacing.md
  },
  mediaLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm
  },
  mediaItem: {
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  mediaPreview: {
    width: "100%",
    height: 200,
    borderRadius: spacing.md,
    backgroundColor: colors.surface
  },
  videoPlaceholder: {
    width: "100%",
    height: 200,
    borderRadius: spacing.md,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  videoText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.textSecondary
  }
});
