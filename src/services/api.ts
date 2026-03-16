import { API_BASE_URL } from "../constants/config";

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  
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
      throw new Error(`Invalid response format from server: ${parseErr instanceof Error ? parseErr.message : 'Unknown error'}`);
    }

    if (!response.ok) {
      const message = typeof data === "string" ? data : data?.error || data?.details || "Request failed";
      throw new Error(message);
    }

    return data as T;
  } catch (networkErr: any) {
    throw new Error(networkErr instanceof Error ? networkErr.message : "Network request failed");
  }
}
