import { Logger } from '@nestjs/common';
import { InMemoryAccountRepository } from 'src/identity/infrastructure/persistence/in-memory-account.repository';
import { InMemoryPasswordResetRepository } from 'src/identity/infrastructure/persistence/in-memory-password-reset.repository';
import { InMemoryPasswordResetMailer } from 'src/identity/infrastructure/mail/in-memory-password-reset-mailer';
import { Account } from 'src/identity/domain/account.entity';
import { PasswordReset } from 'src/identity/domain/password-reset.entity';
import { hashOtpCode } from 'src/shared/otp';
import { RequestPasswordResetUseCase } from './request-password-reset.usecase';

const ALICE_EMAIL = 'alice@example.com';
const THIRTY_SECONDS = 30 * 1000;
const TWO_MINUTES = 2 * 60 * 1000;

describe('RequestPasswordResetUseCase', () => {
  let accountRepository: InMemoryAccountRepository;
  let resetRepository: InMemoryPasswordResetRepository;
  let mailer: InMemoryPasswordResetMailer;
  let useCase: RequestPasswordResetUseCase;

  async function givenPendingReset(sentMillisecondsAgo: number) {
    const sentAt = new Date(Date.now() - sentMillisecondsAgo);
    const reset = new PasswordReset(
      'alice-id',
      hashOtpCode('111111'),
      new Date(sentAt.getTime() + 15 * 60 * 1000),
      sentAt,
      3,
    );
    await resetRepository.save(reset);
  }

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    accountRepository = new InMemoryAccountRepository();
    resetRepository = new InMemoryPasswordResetRepository();
    mailer = new InMemoryPasswordResetMailer();
    useCase = new RequestPasswordResetUseCase(
      accountRepository,
      resetRepository,
      mailer,
    );

    const alice = Account.local({
      id: 'alice-id',
      username: 'alice',
      email: ALICE_EMAIL,
      password: 'hashed:Old-Password-1!',
      otp_code: '000000',
      otp_expiry: new Date(),
      otp_sent_at: new Date(),
    });
    await accountRepository.save(alice);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('emails a code to the account', async () => {
    await useCase.execute({ email: ALICE_EMAIL });

    expect(mailer.sentResetCodes).toHaveLength(1);
    const mail = mailer.sentResetCodes[0];
    expect(mail.accountId).toBe('alice-id');
    expect(mail.email).toBe(ALICE_EMAIL);
    expect(mail.code).toMatch(/^\d{6}$/);
  });

  it('stores only the hash of the code', async () => {
    await useCase.execute({ email: ALICE_EMAIL });

    const reset = await resetRepository.findByAccountId('alice-id');
    const sentCode = mailer.sentResetCodes[0].code;
    expect(reset?.codeHash).toBe(hashOtpCode(sentCode));
    expect(reset?.codeHash).not.toBe(sentCode);
  });

  it('answers the same way for an unknown email, without sending', async () => {
    await expect(
      useCase.execute({ email: 'unknown@example.com' }),
    ).resolves.toBeUndefined();

    expect(mailer.sentResetCodes).toHaveLength(0);
  });

  it('does nothing for a google account', async () => {
    const bob = Account.google({
      id: 'bob-id',
      username: 'bob',
      email: 'bob@example.com',
      password: 'random',
    });
    await accountRepository.save(bob);

    await useCase.execute({ email: 'bob@example.com' });

    expect(mailer.sentResetCodes).toHaveLength(0);
    expect(resetRepository.resets.has('bob-id')).toBe(false);
  });

  it('ignores a new request before the end of the cooldown', async () => {
    await givenPendingReset(THIRTY_SECONDS);

    await useCase.execute({ email: ALICE_EMAIL });

    expect(mailer.sentResetCodes).toHaveLength(0);
    const reset = await resetRepository.findByAccountId('alice-id');
    expect(reset?.codeHash).toBe(hashOtpCode('111111'));
  });

  it('replaces the previous code and its attempts once the cooldown is over', async () => {
    await givenPendingReset(TWO_MINUTES);

    await useCase.execute({ email: ALICE_EMAIL });

    const reset = await resetRepository.findByAccountId('alice-id');
    const sentCode = mailer.sentResetCodes[0].code;
    expect(reset?.codeHash).toBe(hashOtpCode(sentCode));
    expect(reset?.attempts).toBe(0);
  });

  it('does not fail when the email cannot be sent', async () => {
    const loggedErrors = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    mailer.isFailing = true;

    await expect(
      useCase.execute({ email: ALICE_EMAIL }),
    ).resolves.toBeUndefined();

    // The failure is logged once the sending promise has settled
    await new Promise((resolve) => setImmediate(resolve));
    expect(loggedErrors).toHaveBeenCalled();
  });
});
