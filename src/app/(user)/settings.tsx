import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { TextField } from "../../components/ui/TextField";
import { colors, spacing, typography } from "../../constants/theme";
import { getMunicipalityByArea, submitBlog } from "../../services/community";
import { MunicipalityInfo } from "../../types/community";
import { useAuth } from "../../context/AuthContext";

type BlogMedia = {
  mediaType: "image" | "video";
  mediaUrl: string;
  previewUri: string;
};

export default function SettingsTab() {
  const router = useRouter();
  const { user, fullName } = useAuth();
  const [municipality, setMunicipality] = useState<MunicipalityInfo | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [blogMessage, setBlogMessage] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<BlogMedia[]>([]);

  const [blogForm, setBlogForm] = useState({
    title: "",
    content: ""
  });

  const resolveMunicipalityFromRegisteredArea = async () => {
    setLocationMessage(null);
    setWorking(true);

    try {
      const area = user?.area?.trim() || String((user as any)?.district || "").trim();
      if (!area) {
        setLocationMessage("Area is missing in your profile. Please register again with a valid area.");
        return;
      }
      const result = await getMunicipalityByArea(area);
      setMunicipality(result);
      setLocationMessage(`Municipality mapped from your registered area: ${result.municipalityName}`);
    } catch (err: any) {
      setLocationMessage(err.message || "Failed to fetch municipality from your registered area");
    } finally {
      setWorking(false);
    }
  };

  useEffect(() => {
    resolveMunicipalityFromRegisteredArea();
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
    setBlogMessage(null);

    if (mediaItems.length >= 4) {
      setBlogMessage("You can attach up to 4 media items");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setBlogMessage("Gallery permission is required");
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
        setBlogMessage("Could not read selected media");
        return;
      }

      setMediaItems((prev) => [...prev, { mediaType, mediaUrl, previewUri: asset.uri }]);
    } catch (err: any) {
      setBlogMessage(err.message || "Failed to attach media");
    }
  };

  const handleBlogSubmit = async () => {
    setBlogMessage(null);
    if (!user) {
      setBlogMessage("Please login first");
      router.replace("/login");
      return;
    }

    if (!municipality?.contactEmail) {
      setBlogMessage("Please detect your municipality in Civic Hub first");
      return;
    }

    if (!fullName || !user.email || !blogForm.title) {
      setBlogMessage("Title is required");
      return;
    }

    if (!blogForm.content.trim() && mediaItems.length === 0) {
      setBlogMessage("Add content or attach image/video");
      return;
    }

    try {
      await submitBlog({
        authorName: fullName,
        authorEmail: user.email.toLowerCase(),
        title: blogForm.title,
        content: blogForm.content,
        municipalityEmail: municipality.contactEmail,
        media: mediaItems.map((item) => ({
          mediaType: item.mediaType,
          mediaUrl: item.mediaUrl
        }))
      });
      setBlogMessage("Blog submitted for municipality approval");
      setBlogForm({ title: "", content: "" });
      setMediaItems([]);
    } catch (err: any) {
      setBlogMessage(err.message || "Failed to submit blog");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Civic Hub</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Area-Based Municipality Mapping</Text>
          <Text style={styles.hint}>
            Using your registered area: {user?.area || String((user as any)?.district || "") || "Not set"}
          </Text>
          <PrimaryButton
            label={working ? "Refreshing..." : "Refresh Municipality"}
            onPress={resolveMunicipalityFromRegisteredArea}
            disabled={working}
          />
          {working ? <ActivityIndicator color={colors.primary} /> : null}
          {locationMessage ? <Text style={styles.info}>{locationMessage}</Text> : null}
          {municipality ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoLine}>Municipality: {municipality.municipalityName}</Text>
              <Text style={styles.infoLine}>Type: {municipality.municipalityType}</Text>
              <Text style={styles.infoLine}>District: {municipality.district}</Text>
              <Text style={styles.infoLine}>Email: {municipality.contactEmail}</Text>
              <Text style={styles.infoLine}>Phone: {municipality.contactPhone}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Civic Issues</Text>
          <Text style={styles.hint}>View your previous issues, submit new ones, and mark resolved issues.</Text>
          <PrimaryButton label="Go To My Issues" onPress={() => router.push("/issues")} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Submit Blog / Article</Text>
          <Text style={styles.hint}>This goes to your municipality dashboard for approval first.</Text>
          <Text style={styles.hint}>
            Author: {fullName || "Unknown User"} ({user?.email || "No email"})
          </Text>
          <TextField
            label="Title"
            value={blogForm.title}
            onChangeText={(value) => setBlogForm((prev) => ({ ...prev, title: value }))}
          />
          <Text style={styles.label}>Content</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={blogForm.content}
            onChangeText={(value) => setBlogForm((prev) => ({ ...prev, content: value }))}
            placeholder="Write your blog/article"
            placeholderTextColor={colors.muted}
          />

          <PrimaryButton label="Pick Image/Video From Gallery" onPress={pickMediaFromGallery} />
          {mediaItems.length > 0 ? (
            <View style={styles.mediaList}>
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

          {blogMessage ? <Text style={styles.info}>{blogMessage}</Text> : null}
          <PrimaryButton label="Submit Blog For Approval" onPress={handleBlogSubmit} />
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
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    padding: spacing.lg,
    gap: spacing.sm
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text
  },
  hint: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs
  },
  info: {
    color: colors.primaryDark,
    fontSize: typography.sizes.sm
  },
  infoBox: {
    backgroundColor: colors.background,
    borderRadius: spacing.sm,
    padding: spacing.md,
    gap: spacing.xs
  },
  infoLine: {
    color: colors.text,
    fontSize: typography.sizes.sm
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginTop: spacing.sm
  },
  textArea: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    color: colors.text,
    textAlignVertical: "top"
  },
  mediaList: {
    gap: spacing.sm
  },
  mediaItem: {
    gap: spacing.sm
  },
  mediaPreview: {
    width: "100%",
    height: 180,
    borderRadius: spacing.sm,
    backgroundColor: colors.background
  },
  videoPlaceholder: {
    height: 120,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  videoText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm
  }
});
