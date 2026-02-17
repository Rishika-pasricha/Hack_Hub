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
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextField } from "../components/ui/TextField";
import { colors, spacing, typography } from "../constants/theme";
import { apiRequest } from "../services/api";

type ScreenState = "email" | "otp" | "password";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [screen, setScreen] = useState<ScreenState>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSendOTP = async () => {
    setMessage(null);
    setErrors({});

    if (!email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: "Enter a valid email" });
      return;
    }

    try {
      setLoading(true);
      await apiRequest("/forgot-password", {
        method: "POST",
        body: { email: email.toLowerCase() }
      });
      setMessage("OTP sent to your email");
      setTimeout(() => setScreen("otp"), 1500);
    } catch (err: any) {
      setMessage(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setMessage(null);
    setErrors({});

    if (!otp.trim()) {
      setErrors({ otp: "OTP is required" });
      return;
    }

    try {
      setLoading(true);
      await apiRequest("/verify-otp", {
        method: "POST",
        body: { email: email.toLowerCase(), otp }
      });
      setMessage("OTP verified");
      setTimeout(() => setScreen("password"), 1500);
    } catch (err: any) {
      setMessage(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setMessage(null);
    setErrors({});

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setErrors({
        ...errors,
        password: "Both passwords are required"
      });
      return;
    }

    if (newPassword.length < 8) {
      setErrors({
        ...errors,
        password: "Password must be at least 8 characters"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({
        ...errors,
        password: "Passwords do not match"
      });
      return;
    }

    try {
      setLoading(true);
      await apiRequest("/reset-password", {
        method: "POST",
        body: {
          email: email.toLowerCase(),
          otp,
          newPassword
        }
      });
      setMessage("Password reset successful");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err: any) {
      setMessage(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
        </View>

        {screen === "email" && (
          <View style={styles.form}>
            <Text style={styles.stepText}>Step 1 of 3: Enter your email</Text>
            <TextField
              label="Email"
              placeholder="Enter your registered email"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
            />
            {message && (
              <Text
                style={[
                  styles.message,
                  { color: message.includes("sent") ? colors.success : colors.error }
                ]}
              >
                {message}
              </Text>
            )}
            <PrimaryButton
              label={loading ? "Sending OTP..." : "Send OTP"}
              onPress={handleSendOTP}
              disabled={loading}
            />
          </View>
        )}

        {screen === "otp" && (
          <View style={styles.form}>
            <Text style={styles.stepText}>Step 2 of 3: Enter OTP</Text>
            <TextField
              label="OTP"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChangeText={setOtp}
              error={errors.otp}
              keyboardType="numeric"
            />
            {message && (
              <Text
                style={[
                  styles.message,
                  { color: message.includes("verified") ? colors.success : colors.error }
                ]}
              >
                {message}
              </Text>
            )}
            <PrimaryButton
              label={loading ? "Verifying..." : "Verify OTP"}
              onPress={handleVerifyOTP}
              disabled={loading}
            />
            <PrimaryButton
              label="Back"
              onPress={() => setScreen("email")}
              disabled={loading}
            />
          </View>
        )}

        {screen === "password" && (
          <View style={styles.form}>
            <Text style={styles.stepText}>Step 3 of 3: Set new password</Text>
            <TextField
              label="New Password"
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              error={errors.password}
            />
            <TextField
              label="Confirm Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              error={errors.password}
            />
            {message && (
              <Text
                style={[
                  styles.message,
                  { color: message.includes("successful") ? colors.success : colors.error }
                ]}
              >
                {message}
              </Text>
            )}
            <PrimaryButton
              label={loading ? "Resetting..." : "Reset Password"}
              onPress={handleResetPassword}
              disabled={loading}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    fontSize: typography.sizes.xl,
    fontWeight: "bold",
    color: colors.text
  },
  form: {
    gap: spacing.lg
  },
  stepText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  message: {
    fontSize: typography.sizes.sm,
    textAlign: "center",
    paddingVertical: spacing.sm
  }
});
