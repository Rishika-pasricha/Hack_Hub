import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "../../context/AuthContext";

export default function UserTabsLayout() {
  const router = useRouter();
  const { user, isHydrated } = useAuth();

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/login");
    }
  }, [user, isHydrated]);

  if (!isHydrated || !user) {
    return null;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="blogs"
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="newspaper-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen name="issues" options={{ href: null }} />
      <Tabs.Screen
        name="camera"
        options={{ title: "Camera", tabBarIcon: ({ color, size }) => <Ionicons name="camera-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="shop"
        options={{ title: "Shop", tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
