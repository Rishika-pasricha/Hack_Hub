import { Tabs } from "expo-router";
import { Text } from "react-native";

function Icon({ label }: { label: string }) {
  return <Text>{label}</Text>;
}

export default function UserTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="blogs" options={{ title: "Home", tabBarIcon: () => <Icon label="📰" /> }} />
      <Tabs.Screen name="camera" options={{ title: "Camera", tabBarIcon: () => <Icon label="📷" /> }} />
      <Tabs.Screen name="shop" options={{ title: "Shop", tabBarIcon: () => <Icon label="🛍️" /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: () => <Icon label="⚙️" /> }} />
    </Tabs>
  );
}
