import { PasswordHasher } from 'src/identity/application/ports/password-hasher';

// Test double for use-case specs: readable and instant, no real hashing
export class FakePasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return Promise.resolve(`hashed:${password}`);
  }

  compare(password: string, hashedPassword: string): boolean {
    return hashedPassword === `hashed:${password}`;
  }
}
