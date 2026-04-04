export function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    const message = typeof obj.message === "string" ? obj.message.trim() : "";
    const details = typeof obj.details === "string" ? obj.details.trim() : "";
    const errorText = typeof obj.error === "string" ? obj.error.trim() : "";

    if (message) {
      return message;
    }
    if (details) {
      return details;
    }
    if (errorText) {
      return errorText;
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}

export function logError(context: string, error: unknown) {
  const message = getErrorMessage(error, "Unknown error");
  console.error(`[${context}] ${message}`);
}
