import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextField } from "../components/ui/TextField";
import { colors, spacing, typography } from "../constants/theme";
import { loginUser } from "../services/auth";
import { LoginPayload } from "../types/auth";
import { validateLogin } from "../utils/validators";
import { useAuth } from "../context/AuthContext";

const initialValues: LoginPayload = {
  email: "",
  password: ""
};

export default function LoginScreen() {
  const router = useRouter();
  const { setUser, user, isHydrated } = useAuth();
  const [values, setValues] = useState<LoginPayload>(initialValues);
  const [errors, setErrors] = useState<Partial<LoginPayload>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateField = (key: keyof LoginPayload, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!isHydrated || !user) {
      return;
    }
    if (user.role === "admin") {
      router.replace("/admin-dashboard");
      return;
    }
    router.replace("/blogs");
  }, [user, isHydrated]);

  const handleSubmit = async () => {
    setMessage(null);
    const validationErrors = validateLogin(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);
      const response = await loginUser(values);
      setUser(response);
      setMessage("Login successful");
      setErrors({});
      if (response.role === "admin") {
        router.push("/admin-dashboard");
      } else {
        router.push("/blogs");
      }
    } catch (err: any) {
      setMessage(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Ecofy</Text>
          <Text style={styles.subtitle}>Welcome Back</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            placeholder="Enter your email"
            value={values.email}
            onChangeText={(value) => updateField("email", value)}
            error={errors.email}
          />

          <TextField
            label="Password"
            placeholder="Enter your password"
            value={values.password}
            onChangeText={(value) => updateField("password", value)}
            secureTextEntry
            error={errors.password}
          />

          {message && (
            <Text style={[styles.message, { color: message.includes("success") ? colors.success : colors.error }]}>
              {message}
            </Text>
          )}

          <Link href="/forgot-password" asChild>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </Link>

          <PrimaryButton
            label={loading ? "Logging in..." : "Login"}
            onPress={handleSubmit}
            disabled={loading}
          />

          <View style={styles.signupSection}>
            <Text style={styles.signupText}>New user? </Text>
            <Link href="/register" asChild>
              <Text style={styles.signupLink}>Sign Up</Text>
            </Link>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: "center"
  },
  header: {
    marginBottom: spacing.xxl,
    alignItems: "center"
  },
  title: {
    fontSize: typography.sizes.xxxl,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: spacing.sm
  },
  subtitle: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary
  },
  form: {
    gap: spacing.lg
  },
  message: {
    fontSize: typography.sizes.sm,
    textAlign: "center",
    paddingVertical: spacing.sm
  },
  forgotPassword: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    textAlign: "right",
    marginTop: spacing.sm
  },
  signupSection: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg
  },
  signupText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  signupLink: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: "bold"
  }
});
