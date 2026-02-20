import { Stack } from 'expo-router';
import { AuthProvider } from "../context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(user)" options={{ headerShown: false }} />
        <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="upload-product" options={{ headerShown: true, title: "Upload Product" }} />
        <Stack.Screen name="my-products" options={{ headerShown: true, title: "My Products" }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: true, title: "Forgot Password" }} />
      </Stack>
    </AuthProvider>
  );
}
