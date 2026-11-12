import { Logger } from '@nestjs/common';
import { InMemoryAccountRepository } from 'src/identity/infrastructure/persistence/in-memory-account.repository';
import { InMemoryPasswordResetRepository } from 'src/identity/infrastructure/persistence/in-memory-password-reset.repository';
import { InMemoryPasswordResetMailer } from 'src/identity/infrastructure/mail/in-memory-password-reset-mailer';
import { FakePasswordHasher } from 'src/identity/infrastructure/crypto/fake-password-hasher';
import { Account } from 'src/identity/domain/account.entity';
import { PasswordReset } from 'src/identity/domain/password-reset.entity';
import { InvalidOTP } from 'src/identity/domain/errors/invalid-otp.error';
import { TooManyOtpAttempts } from 'src/identity/domain/errors/too-many-otp-attempts.error';
import { hashOtpCode } from 'src/shared/otp';
import { ResetPasswordUseCase } from './reset-password.usecase';
import { ResetPasswordInput } from './reset-password.contracts';

const RESET_CODE = '123456';
const WRONG_CODE = '654321';
const OLD_PASSWORD = 'Old-Password-1!';
const NEW_PASSWORD = 'New-Password-1!';
const FIFTEEN_MINUTES = 15 * 60 * 1000;

const aliceInput: ResetPasswordInput = {
  username: 'alice',
  otp_code: RESET_CODE,
  new_password: NEW_PASSWORD,
};

describe('ResetPasswordUseCase', () => {
  let accountRepository: InMemoryAccountRepository;
  let resetRepository: InMemoryPasswordResetRepository;
  let mailer: InMemoryPasswordResetMailer;
  let hasher: FakePasswordHasher;
  let useCase: ResetPasswordUseCase;

  async function givenAlice(isActive: boolean) {
    const alice = Account.local({
      id: 'alice-id',
      username: 'alice',
      email: 'alice@example.com',
      password: `hashed:${OLD_PASSWORD}`,
      otp_code: '000000',
      otp_expiry: new Date(Date.now() + FIFTEEN_MINUTES),
      otp_sent_at: new Date(),
    });
    alice.is_active = isActive;
    await accountRepository.save(alice);
  }

  async function givenPendingReset(expiresAt: Date) {
    const reset = PasswordReset.create({
      accountId: 'alice-id',
      codeHash: hashOtpCode(RESET_CODE),
      expiresAt,
      sentAt: new Date(),
    });
    await resetRepository.save(reset);
  }

  async function storedAlice(): Promise<Account> {
    const account = await accountRepository.findById('alice-id');
    if (!account) {
      throw new Error('Alice should be stored');
    }
    return account;
  }

  async function aliceCanSignInWith(password: string): Promise<boolean> {
    const account = await storedAlice();
    if (account.password === null) {
      return false;
    }
    return hasher.compare(password, account.password);
  }

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    accountRepository = new InMemoryAccountRepository();
    resetRepository = new InMemoryPasswordResetRepository();
    mailer = new InMemoryPasswordResetMailer();
    hasher = new FakePasswordHasher();
    useCase = new ResetPasswordUseCase(
      accountRepository,
      resetRepository,
      hasher,
      mailer,
    );

    await givenAlice(true);
    await givenPendingReset(new Date(Date.now() + FIFTEEN_MINUTES));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('with the right code', () => {
    it('replaces the password', async () => {
      await useCase.execute(aliceInput);

      expect(await aliceCanSignInWith(NEW_PASSWORD)).toBe(true);
      expect(await aliceCanSignInWith(OLD_PASSWORD)).toBe(false);
    });

    it('makes the code single-use', async () => {
      await useCase.execute(aliceInput);

      const secondReset = { ...aliceInput, new_password: 'Other-Password-1!' };

      await expect(useCase.execute(secondReset)).rejects.toThrow(InvalidOTP);
      expect(await aliceCanSignInWith(NEW_PASSWORD)).toBe(true);
    });

    it('activates an account that was not verified yet', async () => {
      await givenAlice(false);

      await useCase.execute(aliceInput);

      const alice = await storedAlice();
      expect(alice.is_active).toBe(true);
    });

    it('warns the owner by email that the password changed', async () => {
      await useCase.execute(aliceInput);

      expect(mailer.sentPasswordChanged).toEqual([
        { accountId: 'alice-id', email: 'alice@example.com' },
      ]);
    });

    it('does not fail when the warning email cannot be sent', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      mailer.isFailing = true;

      await useCase.execute(aliceInput);

      expect(await aliceCanSignInWith(NEW_PASSWORD)).toBe(true);
    });
  });

  describe('concurrency', () => {
    it('lets only one of two simultaneous resets with the right code pass', async () => {
      const aliceReset = useCase.execute(aliceInput);
      const attackerReset = useCase.execute({
        ...aliceInput,
        new_password: 'Attacker-Password-1!',
      });

      const results = await Promise.allSettled([aliceReset, attackerReset]);

      const statuses = results.map((result) => result.status);
      expect(statuses).toEqual(['fulfilled', 'rejected']);
      const attackerResult = results[1];
      if (attackerResult.status === 'rejected') {
        expect(attackerResult.reason).toBeInstanceOf(InvalidOTP);
      }
      expect(await aliceCanSignInWith(NEW_PASSWORD)).toBe(true);
    });
  });

  describe('errors', () => {
    it('rejects a wrong code and keeps the password', async () => {
      const wrongCodeInput = { ...aliceInput, otp_code: WRONG_CODE };

      await expect(useCase.execute(wrongCodeInput)).rejects.toThrow(InvalidOTP);
      expect(await aliceCanSignInWith(OLD_PASSWORD)).toBe(true);
      expect(mailer.sentPasswordChanged).toHaveLength(0);
    });

    it('counts the wrong codes', async () => {
      const wrongCodeInput = { ...aliceInput, otp_code: WRONG_CODE };

      await expect(useCase.execute(wrongCodeInput)).rejects.toThrow(InvalidOTP);

      const reset = await resetRepository.findByAccountId('alice-id');
      expect(reset?.attempts).toBe(1);
    });

    it('refuses even the right code after 5 wrong ones', async () => {
      const wrongCodeInput = { ...aliceInput, otp_code: WRONG_CODE };
      for (let attempt = 0; attempt < 5; attempt++) {
        await expect(useCase.execute(wrongCodeInput)).rejects.toThrow(
          InvalidOTP,
        );
      }

      await expect(useCase.execute(aliceInput)).rejects.toThrow(
        TooManyOtpAttempts,
      );
      expect(await aliceCanSignInWith(OLD_PASSWORD)).toBe(true);
    });

    it('rejects an expired code', async () => {
      await givenPendingReset(new Date(Date.now() - 1000));

      await expect(useCase.execute(aliceInput)).rejects.toThrow(InvalidOTP);
      expect(await aliceCanSignInWith(OLD_PASSWORD)).toBe(true);
    });

    it('rejects an account without any reset requested', async () => {
      resetRepository.resets.clear();

      await expect(useCase.execute(aliceInput)).rejects.toThrow(InvalidOTP);
    });

    it('rejects an unknown username with the same error as a wrong code', async () => {
      const unknownUsernameInput = { ...aliceInput, username: 'unknown' };

      await expect(useCase.execute(unknownUsernameInput)).rejects.toThrow(
        InvalidOTP,
      );
    });
  });
});
