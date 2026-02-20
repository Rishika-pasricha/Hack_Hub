import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextField } from "../components/ui/TextField";
import { HARYANA_DISTRICTS } from "../constants/districts";
import { colors, spacing, typography } from "../constants/theme";
import { registerUser } from "../services/auth";
import { RegisterPayload } from "../types/auth";
import { validateRegister } from "../utils/validators";

const initialValues: RegisterPayload = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  district: ""
};

export default function RegisterScreen() {
  const router = useRouter();
  const [values, setValues] = useState<RegisterPayload>(initialValues);
  const [errors, setErrors] = useState<Partial<RegisterPayload> & { confirmPassword?: string }>({});
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");

  const filteredDistricts = HARYANA_DISTRICTS.filter((district) =>
    district.toLowerCase().includes(districtSearch.trim().toLowerCase())
  );

  const updateField = (key: keyof RegisterPayload, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setMessage(null);
    const validationErrors = validateRegister(values, confirmPassword);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);
      await registerUser(values);
      setMessage("Registration successful");
      setErrors({});
      setConfirmPassword("");
      setValues(initialValues);
      setTimeout(() => router.replace("/"), 800);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Registration failed";
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Join Ecofy and start tracking your impact.</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="First name"
            placeholder="Aanya"
            value={values.firstName}
            onChangeText={(text) => updateField("firstName", text)}
            error={errors.firstName}
          />
          <TextField
            label="Last name"
            placeholder="Sharma"
            value={values.lastName}
            onChangeText={(text) => updateField("lastName", text)}
            error={errors.lastName}
          />
          <TextField
            label="Email"
            placeholder="aanya@example.com"
            value={values.email}
            onChangeText={(text) => updateField("email", text)}
            keyboardType="email-address"
            error={errors.email}
          />
          <TextField
            label="Password"
            placeholder="Minimum 8 characters"
            value={values.password}
            onChangeText={(text) => updateField("password", text)}
            error={errors.password}
            keyboardType="default"
            secureTextEntry
          />
          <Text style={styles.label}>District</Text>
          <Pressable style={styles.dropdown} onPress={() => setDistrictPickerOpen(true)}>
            <Text style={values.district ? styles.dropdownValue : styles.dropdownPlaceholder}>
              {values.district || "Select your district"}
            </Text>
          </Pressable>
          {errors.district ? <Text style={styles.fieldError}>{errors.district}</Text> : null}
          <TextField
            label="Confirm password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
            keyboardType="default"
            secureTextEntry
          />

          {message ? (
            <Text
              style={[
                styles.message,
                message === "Registration successful" ? styles.success : styles.error
              ]}
            >
              {message}
            </Text>
          ) : null}

          <PrimaryButton
            label={loading ? "Creating account..." : "Create account"}
            onPress={handleSubmit}
            disabled={loading}
          />
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={districtPickerOpen} transparent animationType="slide" onRequestClose={() => setDistrictPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select District</Text>
            <TextInput
              style={styles.searchInput}
              value={districtSearch}
              onChangeText={setDistrictSearch}
              placeholder="Search district"
              placeholderTextColor={colors.muted}
            />
            <FlatList
              data={filteredDistricts}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={styles.optionRow}
                  onPress={() => {
                    updateField("district", item);
                    setDistrictPickerOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>{item}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No district found</Text>}
            />
            <PrimaryButton label="Close" onPress={() => setDistrictPickerOpen(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl
  },
  header: {
    marginBottom: spacing.xl
  },
  title: {
    fontSize: typography.title,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm
  },
  subtitle: {
    fontSize: typography.subtitle,
    color: colors.muted
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border
  },
  label: {
    color: colors.text,
    fontSize: typography.label,
    marginBottom: spacing.xs
  },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background
  },
  dropdownValue: {
    color: colors.text,
    fontSize: typography.body
  },
  dropdownPlaceholder: {
    color: colors.muted,
    fontSize: typography.body
  },
  fieldError: {
    color: colors.error,
    fontSize: typography.label,
    marginBottom: spacing.sm
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end"
  },
  modalCard: {
    maxHeight: "70%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: spacing.lg,
    borderTopRightRadius: spacing.lg,
    padding: spacing.lg,
    gap: spacing.sm
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: "700"
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.background
  },
  optionRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  optionText: {
    color: colors.text,
    fontSize: typography.sizes.sm
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    paddingVertical: spacing.md
  },
  message: {
    marginBottom: spacing.lg,
    fontSize: typography.label
  },
  success: {
    color: colors.success
  },
  error: {
    color: colors.error
  }
});
