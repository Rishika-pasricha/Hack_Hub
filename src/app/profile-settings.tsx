import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextField } from "../components/ui/TextField";
import { colors, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../services/auth";

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user, fullName, isHydrated, logout, setUser } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    area: "",
    profileImageUrl: ""
  });
  const [previewUri, setPreviewUri] = useState("");

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      setForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        area: user.area || "",
        profileImageUrl: user.profileImageUrl || ""
      });
      setPreviewUri(user.profileImageUrl || "");
    }
  }, [user, isHydrated]);

  if (!isHydrated || !user) {
    return null;
  }

  const pickProfileImageFromGallery = async () => {
    setMessage(null);
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
    setForm((prev) => ({ ...prev, profileImageUrl: dataUrl }));
    setPreviewUri(asset.uri);
  };

  const handleSaveProfile = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.area.trim()) {
      setMessage("First name, last name and area are required");
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const updated = await updateProfile({
        userEmail: user.email.toLowerCase(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        area: form.area.trim(),
        profileImageUrl: form.profileImageUrl || ""
      });

      setUser({
        ...user,
        firstName: updated.firstName,
        lastName: updated.lastName,
        area: updated.area,
        profileImageUrl: updated.profileImageUrl || "",
        role: user.role
      });
      setMessage("Profile updated successfully");
    } catch (err: any) {
      setMessage(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your profile picture and account details.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile Photo</Text>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.pfpPreview} resizeMode="cover" />
          ) : (
            <View style={styles.pfpFallback}>
              <Text style={styles.pfpFallbackText}>
                {String(fullName || "U")
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((chunk) => chunk[0]?.toUpperCase() || "")
                  .join("")}
              </Text>
            </View>
          )}
          <PrimaryButton label="Choose From Gallery" onPress={pickProfileImageFromGallery} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Details</Text>
          <TextField
            label="First Name"
            value={form.firstName}
            onChangeText={(value) => setForm((prev) => ({ ...prev, firstName: value }))}
          />
          <TextField
            label="Last Name"
            value={form.lastName}
            onChangeText={(value) => setForm((prev) => ({ ...prev, lastName: value }))}
          />
          <TextField
            label="Area"
            value={form.area}
            onChangeText={(value) => setForm((prev) => ({ ...prev, area: value }))}
          />
          <Text style={styles.infoLine}>Email: {user.email}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <PrimaryButton label={saving ? "Saving..." : "Save Changes"} onPress={handleSaveProfile} disabled={saving} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Access</Text>
          <PrimaryButton label="My Posts" onPress={() => router.push("/my-posts")} />
          <PrimaryButton label="Civic Hub" onPress={() => router.push("/settings")} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Session</Text>
          <PrimaryButton
            label="Logout"
            onPress={() => {
              logout();
              router.replace("/login");
            }}
          />
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
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text
  },
  pfpPreview: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: "#4AA271",
    backgroundColor: colors.background
  },
  pfpFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: "#4AA271",
    backgroundColor: "#E9F8EE",
    alignItems: "center",
    justifyContent: "center"
  },
  pfpFallbackText: {
    color: "#1C5D43",
    fontSize: typography.sizes.lg,
    fontWeight: "700"
  },
  infoLine: {
    fontSize: typography.sizes.sm,
    color: colors.text
  },
  message: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark
  }
});
