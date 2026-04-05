import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "../context/AuthContext";
import { AppErrorBoundary } from "../components/ui/AppErrorBoundary";
import { logError } from "../utils/errorLogger";

SplashScreen.preventAutoHideAsync().catch(() => {
  logError("RootLayout.preventAutoHideAsync", new Error("Failed to keep splash visible during bootstrap"));
});

export default function RootLayout() {
  useEffect(() => {
    const globalObject = globalThis as {
      onunhandledrejection?: ((event: unknown) => void) | null;
      ErrorUtils?: {
        getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
        setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
      };
    };

    const previousUnhandledRejection = globalObject.onunhandledrejection;
    globalObject.onunhandledrejection = (event: unknown) => {
      const reason = (event as { reason?: unknown })?.reason ?? event;
      logError("RootLayout.unhandledrejection", reason);

      if (typeof previousUnhandledRejection === "function") {
        previousUnhandledRejection(event);
      }
    };

    const previousGlobalErrorHandler = globalObject.ErrorUtils?.getGlobalHandler?.();
    if (globalObject.ErrorUtils?.setGlobalHandler) {
      globalObject.ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
        logError("RootLayout.globalError", error, { isFatal: Boolean(isFatal) });

        if (typeof previousGlobalErrorHandler === "function") {
          previousGlobalErrorHandler(error, isFatal);
        }
      });
    }

    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {
        logError("RootLayout.hideAsync", new Error("Failed to hide splash screen"));
      });
    }, 4000);

    return () => {
      clearTimeout(timer);
      globalObject.onunhandledrejection = previousUnhandledRejection;
      if (globalObject.ErrorUtils?.setGlobalHandler && previousGlobalErrorHandler) {
        globalObject.ErrorUtils.setGlobalHandler(previousGlobalErrorHandler);
      }
    };
  }, []);

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="(user)" options={{ headerShown: false }} />
          <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="submit-issue" options={{ headerShown: true, title: "Submit Civic Issue" }} />
          <Stack.Screen name="upload-product" options={{ headerShown: true, title: "Upload Product" }} />
          <Stack.Screen name="my-products" options={{ headerShown: true, title: "My Products" }} />
          <Stack.Screen name="my-posts" options={{ headerShown: true, title: "My Posts" }} />
          <Stack.Screen name="profile-settings" options={{ headerShown: true, title: "Settings" }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: true, title: "Forgot Password" }} />
        </Stack>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
