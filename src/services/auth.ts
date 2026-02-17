import { apiRequest } from "./api";
import { RegisterPayload, RegisterResponse, LoginPayload, LoginResponse } from "../types/auth";

export function registerUser(payload: RegisterPayload) {
  return apiRequest<RegisterResponse>("/register", {
    method: "POST",
    body: payload
  });
}

export function loginUser(payload: LoginPayload) {
  return apiRequest<LoginResponse>("/login", {
    method: "POST",
    body: payload
  });
}
