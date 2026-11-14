import { Logger } from '@nestjs/common';
import { InMemoryAccountRepository } from 'src/identity/infrastructure/persistence/in-memory-account.repository';
import { Account } from 'src/identity/domain/account.entity';
import { DEV1_ACCOUNT, DEV2_ACCOUNT } from 'src/identity/domain/dev-accounts';
import { RemoveDevAccountsUseCase } from './remove-dev-accounts.usecase';

describe('RemoveDevAccountsUseCase', () => {
  let repository: InMemoryAccountRepository;
  let useCase: RemoveDevAccountsUseCase;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    repository = new InMemoryAccountRepository();
    useCase = new RemoveDevAccountsUseCase(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deletes dev1 and dev2', async () => {
    await repository.save(Account.dev({ ...DEV1_ACCOUNT, password: 'hash' }));
    await repository.save(Account.dev({ ...DEV2_ACCOUNT, password: 'hash' }));

    await useCase.execute();

    expect(repository.accounts.size).toBe(0);
  });

  it('does nothing when there is no dev account', async () => {
    await expect(useCase.execute()).resolves.toBeUndefined();
  });

  it('never deletes a real account named dev1', async () => {
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

    expect(await repository.findById('real-id')).not.toBeNull();
  });
});
