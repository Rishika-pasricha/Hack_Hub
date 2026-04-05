import Constants from "expo-constants";

const DEFAULT_API_BASE_URL = "https://hack-hub-0bok.onrender.com";

const configExtra = (Constants.expoConfig?.extra || {}) as {
	publicApiBaseUrl?: string;
};

const resolvedBaseUrl =
	process.env.EXPO_PUBLIC_API_BASE_URL ||
	configExtra.publicApiBaseUrl ||
	DEFAULT_API_BASE_URL;

export const API_BASE_URL = resolvedBaseUrl.replace(/\/+$/, "");
