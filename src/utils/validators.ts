import { RegisterPayload, LoginPayload } from "../types/auth";

export type RegisterErrors = Partial<Record<keyof RegisterPayload, string>>;
export type LoginErrors = Partial<Record<keyof LoginPayload, string>>;

export function validateRegister(
  values: RegisterPayload,
  confirmPassword: string
): RegisterErrors & { confirmPassword?: string } {
  const errors: RegisterErrors = {};

  if (!values.firstName.trim()) {
    errors.firstName = "First name is required";
  }

  if (!values.lastName.trim()) {
    errors.lastName = "Last name is required";
  }

  const emailValue = values.email.trim();
  if (!emailValue) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
    errors.email = "Enter a valid email";
  }

  if (!values.password.trim()) {
    errors.password = "Password is required";
  } else if (values.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }

  if (!confirmPassword.trim()) {
    return { ...errors, confirmPassword: "Confirm your password" };
  }

  if (values.password !== confirmPassword) {
    return { ...errors, confirmPassword: "Passwords do not match" };
  }

  return errors;
}

export function validateLogin(values: LoginPayload): LoginErrors {
  const errors: LoginErrors = {};

  const emailValue = values.email.trim();
  if (!emailValue) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
    errors.email = "Enter a valid email";
  }

  if (!values.password.trim()) {
    errors.password = "Password is required";
  }

  return errors;
}

