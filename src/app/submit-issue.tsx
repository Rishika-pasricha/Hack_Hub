import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextField } from "../components/ui/TextField";
import { colors, spacing, typography } from "../constants/theme";
import { getMunicipalityByArea, submitIssue } from "../services/community";
import { MunicipalityInfo } from "../types/community";
import { useAuth } from "../context/AuthContext";

export default function SubmitIssueScreen() {
  const router = useRouter();
  const { user, fullName } = useAuth();
  const [municipality, setMunicipality] = useState<MunicipalityInfo | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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

    try {
      setWorking(true);
      await submitIssue({
        userName: fullName,
        userEmail: user.email.toLowerCase(),
        subject: form.subject.trim(),
        description: form.description.trim(),
        municipalityEmail: municipality.contactEmail
      });
      setForm({ subject: "", description: "" });
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
  }
});
