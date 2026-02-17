import { apiRequest } from "./api";
import { RegisterPayload, RegisterResponse } from "../types/auth";

export function registerUser(payload: RegisterPayload) {
  return apiRequest<RegisterResponse>("/register", {
    method: "POST",
    body: payload
  });
}
