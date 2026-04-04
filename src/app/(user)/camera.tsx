import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { colors, radii, spacing, typography } from "../../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { predictWaste } from "../../services/community";

const SCAN_INTERVAL_MS = 1400;

type UiState = "idle" | "detecting" | "ready" | "error";

export default function CameraTab() {
  const cameraRef = useRef<CameraView | null>(null);
  const isAnalyzingRef = useRef(false);
  const isMountedRef = useRef(true);
  const [permission, requestPermission] = useCameraPermissions();
  const [uiState, setUiState] = useState<UiState>("idle");
  const [label, setLabel] = useState("Point your camera at waste");
  const [confidence, setConfidence] = useState<number | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const analyzeFrame = useCallback(async () => {
    if (!cameraRef.current || isAnalyzingRef.current) {
      return;
    }

    try {
      isAnalyzingRef.current = true;
      setUiState((prev) => (prev === "ready" ? prev : "detecting"));

      const snapshot = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.35,
        skipProcessing: true
      });

      if (!snapshot?.base64 || !isMountedRef.current) {
        return;
      }

      const prediction = await predictWaste(`data:image/jpeg;base64,${snapshot.base64}`);

      if (!isMountedRef.current) {
        return;
      }

      setLabel(prediction.label || "Unknown");
      setConfidence(Number.isFinite(prediction.confidence) ? prediction.confidence : null);
      setUiState("ready");
    } catch {
      if (!isMountedRef.current) {
        return;
      }
      setUiState("error");
      setLabel("Could not detect waste type");
      setConfidence(null);
    } finally {
      isAnalyzingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!permission?.granted) {
      return;
    }

    const interval = setInterval(() => {
      void analyzeFrame();
    }, SCAN_INTERVAL_MS);

    void analyzeFrame();

    return () => clearInterval(interval);
  }, [analyzeFrame, permission?.granted]);

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          <Text style={styles.subtitle}>Checking camera permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          <Text style={styles.title}>Camera Access Needed</Text>
          <Text style={styles.subtitle}>
            Enable camera access to start instant waste segregation predictions.
          </Text>
          <Text style={styles.permissionAction} onPress={() => void requestPermission()}>
            Grant Camera Permission
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <Text style={styles.title}>Live Waste Scanner</Text>
        <Text style={styles.subtitle}>Hold waste in frame for automatic classification.</Text>

        <View style={styles.previewBox}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />

          <View style={styles.predictionCard}>
            <Text style={styles.predictionState}>
              {uiState === "detecting" ? "Detecting..." : uiState === "error" ? "Prediction Error" : "Prediction"}
            </Text>
            <Text style={styles.predictionLabel}>{label}</Text>
            <Text style={styles.predictionConfidence}>
              {confidence === null ? "--" : `${(confidence * 100).toFixed(1)}% confidence`}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  previewBox: {
    flex: 1,
    overflow: "hidden",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#000"
  },
  camera: {
    flex: 1
  },
  predictionCard: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: "rgba(15, 109, 89, 0.9)",
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs
  },
  predictionState: {
    color: "#e7f6ef",
    fontSize: typography.sizes.xs,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "700"
  },
  predictionLabel: {
    color: "#fff",
    fontSize: typography.sizes.lg,
    fontWeight: "700"
  },
  predictionConfidence: {
    color: "#d4f4e7",
    fontSize: typography.sizes.sm,
    fontWeight: "600"
  },
  permissionAction: {
    marginTop: spacing.sm,
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: "700"
  }
});
