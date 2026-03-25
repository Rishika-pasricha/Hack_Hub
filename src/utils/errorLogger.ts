export function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (error instanceof Error && error.message) {
    return error.message;
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
