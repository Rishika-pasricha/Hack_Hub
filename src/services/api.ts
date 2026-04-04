import { API_BASE_URL } from "../constants/config";
import { getErrorMessage, logError } from "../utils/errorLogger";

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

type HttpError = Error & { status?: number };

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toHttpError(message: string, status?: number): HttpError {
  const error = new Error(message) as HttpError;
  if (status) {
    error.status = status;
  }
  return error;
}

function shouldRetry(status?: number) {
  return typeof status === "number" && RETRYABLE_STATUS_CODES.has(status);
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL. Configure your frontend .env.");
  }

  const url = `${API_BASE_URL}${path}`;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: options.method ?? "GET",
        headers: {
          "Content-Type": "application/json"
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      let data: any;

      try {
        data = isJson ? await response.json() : await response.text();
      } catch (parseErr) {
        throw toHttpError(
          `Invalid response format from server: ${parseErr instanceof Error ? parseErr.message : "Unknown error"}`,
          response.status
        );
      }

      if (!response.ok) {
        const message =
          typeof data === "string"
            ? data
            : [data?.error, data?.details].filter((part: unknown): part is string => typeof part === "string" && part.trim().length > 0).join(" | ") ||
              "Request failed";
        throw toHttpError(message, response.status);
      }

      return data as T;
    } catch (error) {
      const status = (error as HttpError)?.status;
      const retrying = attempt < maxAttempts && shouldRetry(status);
      const message = getErrorMessage(error, "Network request failed");

      logError(`apiRequest ${options.method ?? "GET"} ${path}`, message);

      if (!retrying) {
        throw new Error(message);
      }

      await sleep(300 * attempt);
    }
  }

  throw new Error("Request failed");
}
