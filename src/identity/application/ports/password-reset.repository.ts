import { PasswordReset } from 'src/identity/domain/password-reset.entity';

export interface PasswordResetRepository {
  findByAccountId(accountId: string): Promise<PasswordReset | null>;
  // Replaces the pending reset of the account, if any
  save(reset: PasswordReset): Promise<void>;
  // Atomically uses one attempt if fewer than `maxAttempts` were used.
  // Returns false when none is left, or when there is no pending reset.
  consumeAttempt(accountId: string, maxAttempts: number): Promise<boolean>;
  // Atomically deletes the pending reset if its code matches and has not
  // expired. Returns false otherwise: two requests with the right code cannot
  // both succeed, the code is single-use.
  consumeCode(accountId: string, codeHash: string, now: Date): Promise<boolean>;
}

export const PASSWORD_RESET_REPOSITORY = Symbol('PasswordResetRepository');
