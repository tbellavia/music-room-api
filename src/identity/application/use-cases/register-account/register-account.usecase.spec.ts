import { InMemoryAccountRepository } from 'src/identity/infrastructure/persistence/in-memory-account.repository';
import { InMemoryVerificationCodeSender } from 'src/identity/infrastructure/mail/in-memory-verification-code-sender';
import { FakePasswordHasher } from 'src/identity/infrastructure/crypto/fake-password-hasher';
import { Account } from 'src/identity/domain/account.entity';
import { AccountAlreadyExistsError } from 'src/identity/domain/errors/account-already-exists.error';
import { VerificationEmailNotSent } from 'src/identity/domain/errors/verification-email-not-sent.error';
import { RegisterAccountInput } from './register-account.contracts';
import { RegisterAccountUseCase } from './register-account.usecase';

const aliceInput: RegisterAccountInput = {
  username: 'alice',
  email: 'alice@example.com',
  password: 'Str0ng-Password!',
};

describe('RegisterAccountUseCase', () => {
  let repository: InMemoryAccountRepository;
  let sender: InMemoryVerificationCodeSender;
  let useCase: RegisterAccountUseCase;

  async function storedAccount(id: string): Promise<Account> {
    const account = await repository.findById(id);
    if (!account) {
      throw new Error('Account should be stored');
    }
    return account;
  }

  beforeEach(() => {
    repository = new InMemoryAccountRepository();
    sender = new InMemoryVerificationCodeSender();
    useCase = new RegisterAccountUseCase(
      repository,
      new FakePasswordHasher(),
      sender,
    );
  });

  it('stores an inactive account with a verification code', async () => {
    const output = await useCase.execute(aliceInput);

    const account = await storedAccount(output.id);
    expect(account.is_active).toBe(false);
    expect(account.otp_code).toMatch(/^\d{6}$/);
    expect(account.password).not.toBe(aliceInput.password);
  });

  it('emails the stored code to the new account', async () => {
    const output = await useCase.execute(aliceInput);

    const account = await storedAccount(output.id);
    expect(sender.sentMails).toEqual([
      {
        accountId: account.id,
        email: 'alice@example.com',
        code: account.otp_code,
      },
    ]);
  });

  it('rejects an email already used, without sending', async () => {
    await useCase.execute(aliceInput);
    const sameEmailInput = { ...aliceInput, username: 'bob' };

    const registration = useCase.execute(sameEmailInput);

    await expect(registration).rejects.toThrow(AccountAlreadyExistsError);
    expect(sender.sentMails).toHaveLength(1);
  });

  it('rejects a username already used, without sending', async () => {
    await useCase.execute(aliceInput);
    const sameUsernameInput = { ...aliceInput, email: 'bob@example.com' };

    const registration = useCase.execute(sameUsernameInput);

    await expect(registration).rejects.toThrow(AccountAlreadyExistsError);
    expect(sender.sentMails).toHaveLength(1);
  });

  it('keeps the account when the email fails, so a new code can be asked', async () => {
    sender.isFailing = true;

    const registration = useCase.execute(aliceInput);

    await expect(registration).rejects.toThrow(VerificationEmailNotSent);
    const account = await repository.findByUsername('alice');
    expect(account).not.toBeNull();
  });
});
