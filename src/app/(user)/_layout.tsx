import { useEffect, useMemo, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import { FeatureWalkthrough } from "../../components/ui/FeatureWalkthrough";
import { logError } from "../../utils/errorLogger";

const FEATURE_TOUR_VERSION = "v1";

export default function UserTabsLayout() {
  const router = useRouter();
  const { user, isHydrated } = useAuth();
  const [isTourVisible, setIsTourVisible] = useState(false);

  const walkthroughStorageKey = useMemo(() => {
    if (!user?.id) {
      return null;
    }
    return `ecofy.walkthrough.${FEATURE_TOUR_VERSION}.${user.id}`;
  }, [user?.id]);

  const replayWalkthroughStorageKey = useMemo(() => {
    if (!user?.id) {
      return null;
    }
    return `ecofy.walkthrough.replay.${FEATURE_TOUR_VERSION}.${user.id}`;
  }, [user?.id]);

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/login");
    }
  }, [user, isHydrated]);

  useEffect(() => {
    let active = true;

    const loadWalkthroughState = async () => {
      if (!isHydrated || !user || user.role !== "user" || !walkthroughStorageKey) {
        if (active) {
          setIsTourVisible(false);
        }
        return;
      }

      try {
        const [storedValue, replayRequested] = await Promise.all([
          AsyncStorage.getItem(walkthroughStorageKey),
          replayWalkthroughStorageKey ? AsyncStorage.getItem(replayWalkthroughStorageKey) : Promise.resolve(null)
        ]);

        if (replayWalkthroughStorageKey && replayRequested === "1") {
          await AsyncStorage.removeItem(replayWalkthroughStorageKey);
        }

        if (active) {
          setIsTourVisible(replayRequested === "1" || !storedValue);
        }
      } catch (error) {
        logError("UserTabsLayout.loadWalkthroughState", error);
        if (active) {
          setIsTourVisible(false);
        }
      }
    };

    void loadWalkthroughState();

    return () => {
      active = false;
    };
  }, [isHydrated, user, walkthroughStorageKey, replayWalkthroughStorageKey]);

  const handleCompleteWalkthrough = async () => {
    setIsTourVisible(false);
    if (!walkthroughStorageKey) {
      return;
    }

    try {
      await AsyncStorage.setItem(walkthroughStorageKey, "seen");
    } catch (error) {
      logError("UserTabsLayout.completeWalkthrough", error);
    }
  };

  if (!isHydrated || !user) {
    return null;
  }

  return (
    <>
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
          options={{ title: "Civic Hub", tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }}
        />
      </Tabs>

      <FeatureWalkthrough
        visible={isTourVisible}
        userName={user?.firstName}
        onComplete={() => {
          void handleCompleteWalkthrough();
        }}
      />
    </>
  );
}
