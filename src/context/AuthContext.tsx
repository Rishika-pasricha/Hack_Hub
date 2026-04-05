import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { validateSession } from "../services/auth";
import { LoginResponse } from "../types/auth";
import { logError } from "../utils/errorLogger";

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
      } catch (error) {
        logError("AuthContext.loadUser", error);
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
      } catch (error) {
        logError("AuthContext.persistUser", error);
      }
    };

    persistUser();
  }, [user, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !user) {
      return;
    }

    let active = true;

    const verifyActiveSession = async () => {
      if (!active) {
        return;
      }

      if (!user.token) {
        setUser(null);
        return;
      }

      try {
        const result = await validateSession({
          email: user.email,
          role: user.role,
          token: user.token
        });

        if (!active) {
          return;
        }

        if (!result.valid) {
          setUser(null);
        }
      } catch (error) {
        logError("AuthContext.verifyActiveSession", error, { email: user.email, role: user.role });
      }
    };

    verifyActiveSession();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        verifyActiveSession();
      }
    });

    const interval = setInterval(() => {
      verifyActiveSession();
    }, 30000);

    return () => {
      active = false;
      subscription.remove();
      clearInterval(interval);
    };
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
