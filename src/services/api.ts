import { API_BASE_URL } from "../constants/config";
import { getErrorMessage, logError } from "../utils/errorLogger";

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
};

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const DEFAULT_GET_TIMEOUT_MS = 30000;
const DEFAULT_MUTATION_TIMEOUT_MS = 45000;

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

function extractErrorMessage(data: unknown): string {
  if (typeof data === "string" && data.trim().length > 0) {
    return data.trim();
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    return [record.error, record.details, record.message]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" | ");
  }

  return "";
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
  const method = options.method ?? "GET";
  const defaultTimeoutMs = method === "GET" ? DEFAULT_GET_TIMEOUT_MS : DEFAULT_MUTATION_TIMEOUT_MS;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutMs = Math.max(1000, Number(options.timeoutMs || defaultTimeoutMs));
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
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
        const message = extractErrorMessage(data) || "Request failed";
        throw toHttpError(message, response.status);
      }

      return data as T;
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") {
        const timeoutMessage = "Request timed out. Please try again.";
        const retrying = attempt < maxAttempts;

        if (!retrying) {
          logError(`apiRequest ${method} ${path}`, timeoutMessage, { attempt, timeoutMs });
          throw toHttpError(timeoutMessage, 408);
        }

        await sleep(300 * attempt);
        continue;
      }

      const status = (error as HttpError)?.status;
      const retrying = attempt < maxAttempts && shouldRetry(status);
      const message = getErrorMessage(error, "Network request failed");

      logError(`apiRequest ${method} ${path}`, message, { attempt, status: status || null });

      if (!retrying) {
        throw new Error(message);
      }

      await sleep(300 * attempt);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error("Request failed");
}
