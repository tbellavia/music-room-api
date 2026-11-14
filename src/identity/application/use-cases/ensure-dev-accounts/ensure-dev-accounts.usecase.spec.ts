import { Logger } from '@nestjs/common';
import { InMemoryAccountRepository } from 'src/identity/infrastructure/persistence/in-memory-account.repository';
import { FakePasswordHasher } from 'src/identity/infrastructure/crypto/fake-password-hasher';
import { Account } from 'src/identity/domain/account.entity';
import {
  DEV1_ACCOUNT,
  DEV2_ACCOUNT,
  DEV_ACCOUNT_PASSWORD,
} from 'src/identity/domain/dev-accounts';
import { EnsureDevAccountsUseCase } from './ensure-dev-accounts.usecase';

describe('EnsureDevAccountsUseCase', () => {
  let repository: InMemoryAccountRepository;
  let passwordHasher: FakePasswordHasher;
  let useCase: EnsureDevAccountsUseCase;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    repository = new InMemoryAccountRepository();
    passwordHasher = new FakePasswordHasher();
    useCase = new EnsureDevAccountsUseCase(repository, passwordHasher);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates dev1 and dev2, already verified', async () => {
    await useCase.execute();

    const dev1 = await repository.findById(DEV1_ACCOUNT.id);
    const dev2 = await repository.findById(DEV2_ACCOUNT.id);
    expect(dev1?.username).toBe('dev1');
    expect(dev2?.username).toBe('dev2');
    expect(dev1?.is_active).toBe(true);
    expect(dev2?.is_active).toBe(true);
  });

  it('stores the simple password hashed', async () => {
    await useCase.execute();

    const dev1 = await repository.findById(DEV1_ACCOUNT.id);
    expect(dev1?.password).not.toBe(DEV_ACCOUNT_PASSWORD);
    const storedPassword = dev1?.password ?? '';
    expect(passwordHasher.compare(DEV_ACCOUNT_PASSWORD, storedPassword)).toBe(
      true,
    );
  });

  it('does not create them again at the next start', async () => {
    await useCase.execute();
    await useCase.execute();

    expect(repository.accounts.size).toBe(2);
  });

  it('leaves a real account with the same username untouched', async () => {
    const realDev1 = Account.local({
      id: 'real-id',
      username: 'dev1',
      email: 'someone@example.com',
      password: 'hashed:Real-Password-1!',
      otp_code: '000000',
      otp_expiry: new Date(),
      otp_sent_at: new Date(),
    });
    await repository.save(realDev1);

    await useCase.execute();

    const stillReal = await repository.findById('real-id');
    expect(stillReal?.password).toBe('hashed:Real-Password-1!');
    expect(await repository.findById(DEV1_ACCOUNT.id)).toBeNull();
    expect(await repository.findById(DEV2_ACCOUNT.id)).not.toBeNull();
  });
});
