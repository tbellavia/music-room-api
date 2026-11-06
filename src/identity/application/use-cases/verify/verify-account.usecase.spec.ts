import { InMemoryAccountRepository } from 'src/identity/infrastructure/persistence/in-memory-account.repository';
import { Account } from 'src/identity/domain/account.entity';
import { AccountNotFound } from 'src/identity/domain/errors/account-not-found.error';
import { AccountAlreadyActive } from 'src/identity/domain/errors/account-already-active.error';
import { InvalidOTP } from 'src/identity/domain/errors/invalid-otp.error';
import { TooManyOtpAttempts } from 'src/identity/domain/errors/too-many-otp-attempts.error';
import { OTP_MAX_ATTEMPTS } from 'src/shared/constants';
import { VerifyAccountUseCase } from './verify-account.usecase';

const validCode = '123456';
const wrongCode = '654321';
const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

describe('VerifyAccountUseCase', () => {
  let repository: InMemoryAccountRepository;
  let useCase: VerifyAccountUseCase;

  async function givenLocalAccount(otpExpiry: Date = inOneHour) {
    const account = Account.local({
      id: 'account-id',
      username: 'alice',
      email: 'alice@example.com',
      password: 'hashed-password',
      otp_code: validCode,
      otp_expiry: otpExpiry,
      otp_sent_at: new Date(),
    });
    await repository.save(account);
  }

  async function storedAccount(): Promise<Account> {
    const account = await repository.findById('account-id');
    if (!account) {
      throw new Error('Account should be stored');
    }
    return account;
  }

  beforeEach(() => {
    repository = new InMemoryAccountRepository();
    useCase = new VerifyAccountUseCase(repository);
  });

  it('activates the account with the right code', async () => {
    await givenLocalAccount();

    await useCase.execute({ username: 'alice', otp_code: validCode });

    const account = await storedAccount();
    expect(account.is_active).toBe(true);
    expect(account.otp_code).toBeNull();
  });

  it('rejects an unknown username', async () => {
    const verification = useCase.execute({
      username: 'unknown',
      otp_code: validCode,
    });

    await expect(verification).rejects.toThrow(AccountNotFound);
  });

  it('rejects a wrong code and counts the attempt', async () => {
    await givenLocalAccount();

    const verification = useCase.execute({
      username: 'alice',
      otp_code: wrongCode,
    });

    await expect(verification).rejects.toThrow(InvalidOTP);
    const account = await storedAccount();
    expect(account.is_active).toBe(false);
    expect(account.otp_attempts).toBe(1);
  });

  it('rejects the right code once it has expired', async () => {
    await givenLocalAccount(oneHourAgo);

    const verification = useCase.execute({
      username: 'alice',
      otp_code: validCode,
    });

    await expect(verification).rejects.toThrow(InvalidOTP);
  });

  it('rejects even the right code once all attempts are used', async () => {
    await givenLocalAccount();
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
      const wrongVerification = useCase.execute({
        username: 'alice',
        otp_code: wrongCode,
      });
      await expect(wrongVerification).rejects.toThrow(InvalidOTP);
    }

    const verification = useCase.execute({
      username: 'alice',
      otp_code: validCode,
    });

    await expect(verification).rejects.toThrow(TooManyOtpAttempts);
    const account = await storedAccount();
    expect(account.is_active).toBe(false);
  });

  it('rejects an account that is already active, without using an attempt', async () => {
    await givenLocalAccount();
    await useCase.execute({ username: 'alice', otp_code: validCode });

    const verification = useCase.execute({
      username: 'alice',
      otp_code: validCode,
    });

    await expect(verification).rejects.toThrow(AccountAlreadyActive);
    const account = await storedAccount();
    expect(account.otp_attempts).toBe(0);
  });

  it('rejects a google account, already active', async () => {
    const googleAccount = Account.google({
      id: 'account-id',
      username: 'alice',
      email: 'alice@example.com',
      password: 'hashed-password',
    });
    await repository.save(googleAccount);

    const verification = useCase.execute({
      username: 'alice',
      otp_code: validCode,
    });

    await expect(verification).rejects.toThrow(AccountAlreadyActive);
  });
});
