import { InMemoryAccountRepository } from 'src/identity/infrastructure/persistence/in-memory-account.repository';
import { Account } from 'src/identity/domain/account.entity';
import { KARIM, LEA } from 'src/demo/domain/demo-accounts';
import { RemoveDemoUseCase } from './remove-demo.usecase';

describe('RemoveDemoUseCase', () => {
  let repository: InMemoryAccountRepository;
  let useCase: RemoveDemoUseCase;

  beforeEach(() => {
    repository = new InMemoryAccountRepository();
    useCase = new RemoveDemoUseCase(repository);
  });

  it('removes the demo accounts', async () => {
    await repository.save(Account.preVerified({ ...LEA, password: 'hash' }));
    await repository.save(Account.preVerified({ ...KARIM, password: 'hash' }));

    const { removedAccounts } = await useCase.execute();

    expect(removedAccounts).toBe(2);
    expect(repository.accounts.size).toBe(0);
  });

  it('never removes a real account, even with a demo username', async () => {
    const realAccount = Account.preVerified({
      id: 'real-account-id',
      username: LEA.username,
      email: LEA.email,
      password: 'hash',
    });
    await repository.save(realAccount);

    const { removedAccounts } = await useCase.execute();

    expect(removedAccounts).toBe(0);
    expect(repository.accounts.has('real-account-id')).toBe(true);
  });

  it('does nothing when there is no demo', async () => {
    const { removedAccounts } = await useCase.execute();

    expect(removedAccounts).toBe(0);
  });
});
