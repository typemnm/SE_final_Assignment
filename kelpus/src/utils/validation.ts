export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidPassword = (password: string): boolean =>
  password.length >= 8;

export const isNotEmpty = (value: string): boolean =>
  value.trim().length > 0;
