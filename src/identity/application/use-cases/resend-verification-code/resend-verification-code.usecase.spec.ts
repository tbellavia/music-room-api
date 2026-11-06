import { InMemoryAccountRepository } from 'src/identity/infrastructure/persistence/in-memory-account.repository';
import { InMemoryVerificationCodeSender } from 'src/identity/infrastructure/mail/in-memory-verification-code-sender';
import { Account } from 'src/identity/domain/account.entity';
import { AccountNotFound } from 'src/identity/domain/errors/account-not-found.error';
import { AccountAlreadyActive } from 'src/identity/domain/errors/account-already-active.error';
import { OtpResendTooSoon } from 'src/identity/domain/errors/otp-resend-too-soon.error';
import { VerificationEmailNotSent } from 'src/identity/domain/errors/verification-email-not-sent.error';
import { ResendVerificationCodeUseCase } from './resend-verification-code.usecase';

const firstCode = '123456';
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

describe('ResendVerificationCodeUseCase', () => {
  let repository: InMemoryAccountRepository;
  let sender: InMemoryVerificationCodeSender;
  let useCase: ResendVerificationCodeUseCase;

  async function givenLocalAccountWithExpiredCode() {
    const account = Account.local({
      id: 'account-id',
      username: 'alice',
      email: 'alice@example.com',
      password: 'hashed-password',
      otp_code: firstCode,
      otp_expiry: oneHourAgo,
      otp_sent_at: oneHourAgo,
    });
    account.otp_attempts = 3;
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
    sender = new InMemoryVerificationCodeSender();
    useCase = new ResendVerificationCodeUseCase(repository, sender);
  });

  it('stores a new valid code and resets the attempts', async () => {
    await givenLocalAccountWithExpiredCode();

    await useCase.execute({ username: 'alice' });

    const account = await storedAccount();
    expect(account.otp_code).toMatch(/^\d{6}$/);
    expect(account.otp_expiry?.getTime()).toBeGreaterThan(Date.now());
    expect(account.otp_attempts).toBe(0);
  });

  it('emails the stored code to the account', async () => {
    await givenLocalAccountWithExpiredCode();

    await useCase.execute({ username: 'alice' });

    const account = await storedAccount();
    expect(sender.sentMails).toEqual([
      { email: 'alice@example.com', code: account.otp_code },
    ]);
  });

  it('refuses a second code right after the first one, without sending', async () => {
    await givenLocalAccountWithExpiredCode();
    await useCase.execute({ username: 'alice' });
    const accountAfterFirstResend = await storedAccount();
    const firstResentCode = accountAfterFirstResend.otp_code;

    const secondResend = useCase.execute({ username: 'alice' });

    await expect(secondResend).rejects.toThrow(OtpResendTooSoon);
    expect(sender.sentMails).toHaveLength(1);
    const account = await storedAccount();
    expect(account.otp_code).toBe(firstResentCode);
  });

  it('rejects an unknown username', async () => {
    const resend = useCase.execute({ username: 'unknown' });

    await expect(resend).rejects.toThrow(AccountNotFound);
    expect(sender.sentMails).toHaveLength(0);
  });

  it('rejects an account that is already active, without sending', async () => {
    const googleAccount = Account.google({
      id: 'account-id',
      username: 'alice',
      email: 'alice@example.com',
      password: 'hashed-password',
    });
    await repository.save(googleAccount);

    const resend = useCase.execute({ username: 'alice' });

    await expect(resend).rejects.toThrow(AccountAlreadyActive);
    expect(sender.sentMails).toHaveLength(0);
  });

  it('reports a failed email, the new code being already stored', async () => {
    await givenLocalAccountWithExpiredCode();
    sender.isFailing = true;

    const resend = useCase.execute({ username: 'alice' });

    await expect(resend).rejects.toThrow(VerificationEmailNotSent);
    const account = await storedAccount();
    expect(account.otp_code).not.toBe(firstCode);
  });
});
