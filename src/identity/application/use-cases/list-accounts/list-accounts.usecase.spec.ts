import { InMemoryAccountRepository } from 'src/identity/infrastructure/persistence/in-memory-account.repository';
import { Account } from 'src/identity/domain/account.entity';
import { ListAccountsUseCase } from './list-accounts.usecase';

const CALLER_ID = 'caller-id';
const inOneHour = new Date(Date.now() + 60 * 60 * 1000);

describe('ListAccountsUseCase', () => {
  let repository: InMemoryAccountRepository;
  let useCase: ListAccountsUseCase;

  async function givenActiveAccount(id: string, username: string) {
    const account = Account.preVerified({
      id,
      username,
      email: `${username}@example.com`,
      password: 'hashed-password',
    });
    await repository.save(account);
  }

  async function givenUnverifiedAccount(id: string, username: string) {
    const account = Account.local({
      id,
      username,
      email: `${username}@example.com`,
      password: 'hashed-password',
      otp_code: '123456',
      otp_expiry: inOneHour,
      otp_sent_at: new Date(),
    });
    await repository.save(account);
  }

  beforeEach(async () => {
    repository = new InMemoryAccountRepository();
    useCase = new ListAccountsUseCase(repository);
    await givenActiveAccount(CALLER_ID, 'caller');
  });

  it('lists the active accounts sorted by username, without the caller', async () => {
    await givenActiveAccount('charlie-id', 'charlie');
    await givenActiveAccount('alice-id', 'alice');
    await givenActiveAccount('bob-id', 'bob');

    const result = await useCase.execute({
      excludedAccountId: CALLER_ID,
      prefix: null,
    });

    expect(result).toEqual([
      { id: 'alice-id', username: 'alice' },
      { id: 'bob-id', username: 'bob' },
      { id: 'charlie-id', username: 'charlie' },
    ]);
  });

  it('does not list an account whose email is not verified yet', async () => {
    await givenActiveAccount('alice-id', 'alice');
    await givenUnverifiedAccount('bob-id', 'bob');

    const result = await useCase.execute({
      excludedAccountId: CALLER_ID,
      prefix: null,
    });

    expect(result).toEqual([{ id: 'alice-id', username: 'alice' }]);
  });

  it('only lists the usernames starting with the prefix', async () => {
    await givenActiveAccount('alice-id', 'alice');
    await givenActiveAccount('alicia-id', 'alicia');
    await givenActiveAccount('malik-id', 'malik');

    const result = await useCase.execute({
      excludedAccountId: CALLER_ID,
      prefix: 'ali',
    });

    expect(result).toEqual([
      { id: 'alice-id', username: 'alice' },
      { id: 'alicia-id', username: 'alicia' },
    ]);
  });

  it('ignores the case of the prefix', async () => {
    await givenActiveAccount('alice-id', 'Alice');

    const result = await useCase.execute({
      excludedAccountId: CALLER_ID,
      prefix: 'aLI',
    });

    expect(result).toEqual([{ id: 'alice-id', username: 'Alice' }]);
  });

  it('lists every account for an empty prefix', async () => {
    await givenActiveAccount('alice-id', 'alice');
    await givenActiveAccount('bob-id', 'bob');

    const result = await useCase.execute({
      excludedAccountId: CALLER_ID,
      prefix: '',
    });

    expect(result).toHaveLength(2);
  });

  it('does not list the caller even when the prefix matches it', async () => {
    await givenActiveAccount('carol-id', 'carol');

    const result = await useCase.execute({
      excludedAccountId: CALLER_ID,
      prefix: 'ca',
    });

    expect(result).toEqual([{ id: 'carol-id', username: 'carol' }]);
  });

  it('returns an empty list when no username matches', async () => {
    await givenActiveAccount('alice-id', 'alice');

    const result = await useCase.execute({
      excludedAccountId: CALLER_ID,
      prefix: 'zz',
    });

    expect(result).toEqual([]);
  });

  it('never exposes the email or the password', async () => {
    await givenActiveAccount('alice-id', 'alice');

    const result = await useCase.execute({
      excludedAccountId: CALLER_ID,
      prefix: null,
    });

    expect(Object.keys(result[0])).toEqual(['id', 'username']);
  });
});
