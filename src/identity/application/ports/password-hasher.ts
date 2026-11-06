export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hashedPassword: string): boolean;
}

export const PASSWORD_HASHER = Symbol('PasswordHasher');
