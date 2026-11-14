import { JwtService } from '@nestjs/jwt';
import { InMemoryAccountRepository } from 'src/identity/infrastructure/persistence/in-memory-account.repository';
import { FakePasswordHasher } from 'src/identity/infrastructure/crypto/fake-password-hasher';
import { Account } from 'src/identity/domain/account.entity';
import { AccountNotFound } from 'src/identity/domain/errors/account-not-found.error';
import { Unauthorized } from 'src/identity/domain/errors/unauthorized.error';
import { AccountNotActive } from 'src/identity/domain/errors/account-not-active.error';
import { JwtUser } from 'src/identity/types/jwt-user';
import {
  DEV1_ACCOUNT,
  DEV_ACCOUNT_PASSWORD,
} from 'src/identity/domain/dev-accounts';
import { SignInUseCase } from './sign-in.usecase';

const alicePassword = 'Str0ng-Password!';
const validCode = '123456';
const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
const ONE_HOUR_IN_SECONDS = 60 * 60;
const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

type TokenPayload = JwtUser & {
  iat: number;
  exp: number;
};

describe('SignInUseCase', () => {
  let repository: InMemoryAccountRepository;
  let passwordService: FakePasswordHasher;
  let jwtService: JwtService;
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
    jwtService = new JwtService({
      secret: 'test-secret',
      signOptions: { expiresIn: '60m' },
    });
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

  it('rejects a google account, which has no password', async () => {
    const googleAccount = Account.google({
      id: 'account-id',
      username: 'alice',
      email: 'alice@gmail.com',
      google_id: 'google-sub',
    });
    await repository.save(googleAccount);

    const signIn = useCase.execute({
      username: 'alice',
      password: alicePassword,
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

  describe('dev accounts', () => {
    async function givenDev1() {
      const hashedPassword = await passwordService.hash(DEV_ACCOUNT_PASSWORD);
      await repository.save(
        Account.dev({ ...DEV1_ACCOUNT, password: hashedPassword }),
      );
    }

    function payloadOf(accessToken: string): TokenPayload {
      return jwtService.verify<TokenPayload>(accessToken);
    }

    it('signs dev1 in with the simple password, at once', async () => {
      await givenDev1();

      const output = await useCase.execute({
        username: 'dev1',
        password: DEV_ACCOUNT_PASSWORD,
      });

      expect(payloadOf(output.access_token).sub).toBe(DEV1_ACCOUNT.id);
    });

    it('gives dev1 a 30-day token marked as dev', async () => {
      await givenDev1();

      const output = await useCase.execute({
        username: 'dev1',
        password: DEV_ACCOUNT_PASSWORD,
      });

      const payload = payloadOf(output.access_token);
      expect(payload.dev).toBe(true);
      expect(payload.exp - payload.iat).toBe(THIRTY_DAYS_IN_SECONDS);
    });

    it('keeps the 60-minute token, not marked, for other accounts', async () => {
      await givenAlice(true);

      const output = await useCase.execute({
        username: 'alice',
        password: alicePassword,
      });

      const payload = payloadOf(output.access_token);
      expect(payload.dev).toBeUndefined();
      expect(payload.exp - payload.iat).toBe(ONE_HOUR_IN_SECONDS);
    });
  });
});
