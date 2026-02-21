import { apiRequest } from "./api";
import { RegisterPayload, RegisterResponse, LoginPayload, LoginResponse, ForgotPasswordPayload, VerifyOTPPayload, ResetPasswordPayload } from "../types/auth";

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

export function sendForgotPasswordOTP(payload: ForgotPasswordPayload) {
  return apiRequest<{ message: string }>("/forgot-password", {
    method: "POST",
    body: payload
  });
}

export function verifyOTP(payload: VerifyOTPPayload) {
  return apiRequest<{ message: string; verified: boolean }>("/verify-otp", {
    method: "POST",
    body: payload
  });
}

export function resetPassword(payload: ResetPasswordPayload) {
  return apiRequest<{ message: string }>("/reset-password", {
    method: "POST",
    body: payload
  });
}

export function updateProfile(payload: {
  userEmail: string;
  firstName: string;
  lastName: string;
  area: string;
  profileImageUrl?: string;
}) {
  return apiRequest<LoginResponse>("/profile", {
    method: "PATCH",
    body: payload
  });
}

export function deleteAccount(userEmail: string) {
  return apiRequest<{ message: string }>("/account", {
    method: "DELETE",
    body: { userEmail }
  });
}
