import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "../context/AuthContext";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if splash is already controlled elsewhere.
});

export default function RootLayout() {
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {
        // Ignore hide errors to avoid blocking app startup.
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
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
  );
}
