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
