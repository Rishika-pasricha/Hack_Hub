import { useEffect } from "react";
import { Tabs } from "expo-router";
import { useRouter } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "../../context/AuthContext";

function Icon({ label }: { label: string }) {
  return <Text>{label}</Text>;
}

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
      <Tabs.Screen name="blogs" options={{ title: "Home", tabBarIcon: () => <Icon label="📰" /> }} />
      <Tabs.Screen name="camera" options={{ title: "Camera", tabBarIcon: () => <Icon label="📷" /> }} />
      <Tabs.Screen name="shop" options={{ title: "Shop", tabBarIcon: () => <Icon label="🛍️" /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: () => <Icon label="⚙️" /> }} />
    </Tabs>
  );
}
