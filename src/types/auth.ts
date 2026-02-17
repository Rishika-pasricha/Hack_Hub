export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type RegisterResponse = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  token?: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type VerifyOTPPayload = {
  email: string;
  otp: string;
};

export type ResetPasswordPayload = {
  email: string;
  otp: string;
  newPassword: string;
};
