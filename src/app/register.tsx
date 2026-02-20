import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextField } from "../components/ui/TextField";
import { colors, spacing, typography } from "../constants/theme";
import { registerUser } from "../services/auth";
import { RegisterPayload } from "../types/auth";
import { validateRegister } from "../utils/validators";

const initialValues: RegisterPayload = {
  firstName: "",
  lastName: "",
  email: "",
  password: ""
};

export default function RegisterScreen() {
  const router = useRouter();
  const [values, setValues] = useState<RegisterPayload>(initialValues);
  const [errors, setErrors] = useState<Partial<RegisterPayload> & { confirmPassword?: string }>({});
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
