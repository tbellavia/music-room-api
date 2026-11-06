import { JwtService } from '@nestjs/jwt';
import { InMemoryAccountRepository } from 'src/identity/infrastructure/persistence/in-memory-account.repository';
import { FakePasswordHasher } from 'src/identity/infrastructure/crypto/fake-password-hasher';
import { Account } from 'src/identity/domain/account.entity';
import { AccountNotFound } from 'src/identity/domain/errors/account-not-found.error';
import { Unauthorized } from 'src/identity/domain/errors/unauthorized.error';
import { AccountNotActive } from 'src/identity/domain/errors/account-not-active.error';
import { SignInUseCase } from './sign-in.usecase';

const alicePassword = 'Str0ng-Password!';
const validCode = '123456';
const inOneHour = new Date(Date.now() + 60 * 60 * 1000);

describe('SignInUseCase', () => {
  let repository: InMemoryAccountRepository;
  let passwordService: FakePasswordHasher;
  let useCase: SignInUseCase;

  async function givenAlice(isVerified: boolean) {
    const hashedPassword = await passwordService.hash(alicePassword);
    const account = Account.local({
      id: 'account-id',
      username: 'alice',
      email: 'alice@example.com',
      password: hashedPassword,
      otp_code: validCode,
      otp_expiry: inOneHour,
      otp_sent_at: new Date(),
    });
    if (isVerified) {
      account.activate(validCode, new Date());
    }
    await repository.save(account);
  }

  beforeEach(() => {
    repository = new InMemoryAccountRepository();
    passwordService = new FakePasswordHasher();
    const jwtService = new JwtService({ secret: 'test-secret' });
    useCase = new SignInUseCase(repository, passwordService, jwtService);
  });

  it('returns a token for a verified account', async () => {
    await givenAlice(true);

    const output = await useCase.execute({
      username: 'alice',
      password: alicePassword,
    });

    expect(output.access_token).toEqual(expect.any(String));
  });

  it('rejects an account that is not verified yet', async () => {
    await givenAlice(false);

    const signIn = useCase.execute({
      username: 'alice',
      password: alicePassword,
    });

    await expect(signIn).rejects.toThrow(AccountNotActive);
  });

  it('rejects a wrong password before telling the account is inactive', async () => {
    await givenAlice(false);

    const signIn = useCase.execute({
      username: 'alice',
      password: 'Wrong-Password1!',
    });

    await expect(signIn).rejects.toThrow(Unauthorized);
  });

  it('rejects an unknown username', async () => {
    const signIn = useCase.execute({
      username: 'unknown',
      password: alicePassword,
    });

    await expect(signIn).rejects.toThrow(AccountNotFound);
  });
});
