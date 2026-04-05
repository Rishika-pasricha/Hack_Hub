import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useIsFocused } from "@react-navigation/native";
import { colors, radii, spacing, typography } from "../../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { predictWaste } from "../../services/community";
import { getErrorMessage } from "../../utils/errorLogger";

type UiState = "idle" | "detecting" | "ready" | "error";
const LIVE_SCAN_GAP_MS = 1000;
const CAPTURE_QUALITY = 0.35;
const TARGET_IMAGE_SIZE = 224;

export default function CameraTab() {
  const cameraRef = useRef<CameraView | null>(null);
  const isAnalyzingRef = useRef(false);
  const isMountedRef = useRef(true);
  const liveLoopIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [uiState, setUiState] = useState<UiState>("idle");
  const [label, setLabel] = useState("Point your camera at waste");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [isLiveEnabled, setIsLiveEnabled] = useState(true);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (liveLoopIntervalRef.current) {
        clearInterval(liveLoopIntervalRef.current);
        liveLoopIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      appStateRef.current = nextAppState;
      setIsAppActive(nextAppState === "active");
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const captureAndPredict = useCallback(async () => {
    if (!cameraRef.current || isAnalyzingRef.current) {
      return;
    }

    try {
      const startedAt = Date.now();
      isAnalyzingRef.current = true;
      setUiState((prev) => (prev === "ready" ? prev : "detecting"));

      const snapshot = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: CAPTURE_QUALITY,
        shutterSound: false
      });

      if (!snapshot?.uri || !isMountedRef.current) {
        return;
      }

      const optimized = await manipulateAsync(
        snapshot.uri,
        [{ resize: { width: TARGET_IMAGE_SIZE, height: TARGET_IMAGE_SIZE } }],
        {
          compress: 0.3,
          format: SaveFormat.JPEG,
          base64: true
        }
      );

      if (!optimized.base64 || !isMountedRef.current) {
        return;
      }

      const prediction = await predictWaste(`data:image/jpeg;base64,${optimized.base64}`);

      if (!isMountedRef.current) {
        return;
      }

      setLabel(prediction.label || "Unknown");
      setConfidence(Number.isFinite(prediction.confidence) ? prediction.confidence : null);
      setLastLatencyMs(Date.now() - startedAt);
      setUiState("ready");
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      setUiState("error");
      setLabel(getErrorMessage(error, "Could not detect waste type"));
      setConfidence(null);
      setLastLatencyMs(null);
    } finally {
      isAnalyzingRef.current = false;
    }
  }, []);

  const shouldRunLive = Boolean(permission?.granted && isLiveEnabled && isFocused && isCameraReady && isAppActive);

  useEffect(() => {
    if (!isFocused) {
      setUiState("idle");
    }
  }, [isFocused]);

  useEffect(() => {
    if (!shouldRunLive) {
      if (liveLoopIntervalRef.current) {
        clearInterval(liveLoopIntervalRef.current);
        liveLoopIntervalRef.current = null;
      }
      return;
    }

    void captureAndPredict();
    liveLoopIntervalRef.current = setInterval(() => {
      void captureAndPredict();
    }, LIVE_SCAN_GAP_MS);

    return () => {
      if (liveLoopIntervalRef.current) {
        clearInterval(liveLoopIntervalRef.current);
        liveLoopIntervalRef.current = null;
      }
    };
  }, [captureAndPredict, shouldRunLive]);

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
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onCameraReady={() => {
              setIsCameraReady(true);
            }}
          />

          <View style={styles.predictionCard}>
            <Text style={styles.predictionState}>
              {uiState === "detecting" ? "Detecting..." : uiState === "error" ? "Prediction Error" : "Prediction"}
            </Text>
            <Text style={styles.predictionLabel}>{label}</Text>
            <Text style={styles.predictionConfidence}>
              {confidence === null ? "--" : `${(confidence * 100).toFixed(1)}% confidence`}
            </Text>
            <Text style={styles.predictionMeta}>
              {lastLatencyMs === null ? "Latency: --" : `Latency: ${lastLatencyMs} ms`}
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.liveToggleButton, !isLiveEnabled && styles.liveToggleButtonPaused]}
          onPress={() => setIsLiveEnabled((prev) => !prev)}
        >
          <Text style={styles.liveToggleButtonText}>{isLiveEnabled ? "Pause Live Scan" : "Resume Live Scan"}</Text>
        </Pressable>
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
  predictionMeta: {
    color: "#c8e9db",
    fontSize: typography.sizes.xs,
    fontWeight: "600"
  },
  permissionAction: {
    marginTop: spacing.sm,
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: "700"
  },
  liveToggleButton: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  liveToggleButtonPaused: {
    backgroundColor: "#f3ece2"
  },
  liveToggleButtonText: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: "700"
  }
});
