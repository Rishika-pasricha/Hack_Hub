import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { LoginResponse } from "../types/auth";

export type AuthUser = Pick<
  LoginResponse,
  "id" | "firstName" | "lastName" | "email" | "area" | "profileImageUrl" | "role" | "token"
>;
const AUTH_STORAGE_KEY = "ecofy.auth.user";

type AuthContextValue = {
  user: AuthUser | null;
  isHydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  fullName: string;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      try {
        const rawUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!active || !rawUser) {
          return;
        }
        setUser(JSON.parse(rawUser) as AuthUser);
      } catch {
        setUser(null);
      } finally {
        if (active) {
          setIsHydrated(true);
        }
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const persistUser = async () => {
      try {
        if (user) {
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        } else {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        }
      } catch {
        // Ignore persistence failures to keep auth state usable in memory.
      }
    };

    persistUser();
  }, [user, isHydrated]);

  const value = useMemo<AuthContextValue>(() => {
    const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : "";
    return {
      user,
      isHydrated,
      setUser,
      logout: () => setUser(null),
      fullName
    };
  }, [user, isHydrated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
