import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { InMemoryAccountRepository } from 'src/identity/infrastructure/persistence/in-memory-account.repository';
import { InMemoryGoogleTokenVerifier } from 'src/identity/infrastructure/google/in-memory-google-token-verifier';
import { Account } from 'src/identity/domain/account.entity';
import { AuthMethod } from 'src/identity/domain/auth-method.enum';
import { EmailAlreadyExists } from 'src/identity/domain/errors/email-already-exists.error';
import { InvalidGoogleToken } from 'src/identity/domain/errors/invalid-google-token.error';
import { SignInWithGoogleUseCase } from './sign-in-with-google.usecase';

const aliceToken = 'alice-google-token';
const aliceGoogleId = 'alice-google-sub';
const aliceEmail = 'alice@gmail.com';

type AccessTokenPayload = {
  sub: string;
  username: string;
};

describe('SignInWithGoogleUseCase', () => {
  let repository: InMemoryAccountRepository;
  let googleTokenVerifier: InMemoryGoogleTokenVerifier;
  let jwtService: JwtService;
  let useCase: SignInWithGoogleUseCase;

  function storedAccounts(): Account[] {
    return [...repository.accounts.values()];
  }

  function accountIdOf(accessToken: string): string {
    const payload = jwtService.verify<AccessTokenPayload>(accessToken);
    return payload.sub;
  }

  async function givenLocalAccount(username: string, email: string) {
    const account = Account.local({
      id: `${username}-id`,
      username,
      email,
      password: 'hashed-password',
      otp_code: '123456',
      otp_expiry: new Date(),
      otp_sent_at: new Date(),
    });
    await repository.save(account);
  }

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    repository = new InMemoryAccountRepository();
    googleTokenVerifier = new InMemoryGoogleTokenVerifier();
    googleTokenVerifier.accept(aliceToken, {
      googleId: aliceGoogleId,
      email: aliceEmail,
    });
    jwtService = new JwtService({ secret: 'test-secret' });
    useCase = new SignInWithGoogleUseCase(
      repository,
      googleTokenVerifier,
      jwtService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('first sign-in', () => {
    it('creates an active google account without password', async () => {
      await useCase.execute({ id_token: aliceToken });

      const accounts = storedAccounts();
      expect(accounts).toHaveLength(1);
      const alice = accounts[0];
      expect(alice.auth_method).toBe(AuthMethod.GOOGLE);
      expect(alice.google_id).toBe(aliceGoogleId);
      expect(alice.email).toBe(aliceEmail);
      expect(alice.is_active).toBe(true);
      expect(alice.password).toBeNull();
    });

    it('returns a token for the created account', async () => {
      const output = await useCase.execute({ id_token: aliceToken });

      const alice = storedAccounts()[0];
      expect(accountIdOf(output.access_token)).toBe(alice.id);
    });

    it('generates the username from the email', async () => {
      await useCase.execute({ id_token: aliceToken });

      const alice = storedAccounts()[0];
      expect(alice.username).toBe('alice');
    });

    it('adds a suffix when the username is already taken', async () => {
      await givenLocalAccount('alice', 'other-alice@example.com');

      await useCase.execute({ id_token: aliceToken });

      const googleAlice = storedAccounts().find(
        (account) => account.google_id === aliceGoogleId,
      );
      expect(googleAlice?.username).toMatch(/^alice\d{4}$/);
    });
  });

  describe('next sign-ins', () => {
    it('signs in the existing account without creating another one', async () => {
      const firstOutput = await useCase.execute({ id_token: aliceToken });

      const secondOutput = await useCase.execute({ id_token: aliceToken });

      expect(storedAccounts()).toHaveLength(1);
      const firstAccountId = accountIdOf(firstOutput.access_token);
      expect(accountIdOf(secondOutput.access_token)).toBe(firstAccountId);
    });

    it('finds the account by google id even if the google email changed', async () => {
      await useCase.execute({ id_token: aliceToken });
      googleTokenVerifier.accept('alice-new-email-token', {
        googleId: aliceGoogleId,
        email: 'alice.new@gmail.com',
      });

      await useCase.execute({ id_token: 'alice-new-email-token' });

      expect(storedAccounts()).toHaveLength(1);
    });
  });

  it('rejects an invalid google token, without creating an account', async () => {
    const signIn = useCase.execute({ id_token: 'forged-token' });

    await expect(signIn).rejects.toThrow(InvalidGoogleToken);
    expect(storedAccounts()).toHaveLength(0);
  });

  it('rejects an email already used by a local account, without linking it', async () => {
    await givenLocalAccount('alicelocal', aliceEmail);

    const signIn = useCase.execute({ id_token: aliceToken });

    await expect(signIn).rejects.toThrow(EmailAlreadyExists);
    const localAlice = await repository.findByUsername('alicelocal');
    expect(localAlice?.google_id).toBeNull();
    expect(storedAccounts()).toHaveLength(1);
  });

  it('creates a single account for two simultaneous first sign-ins', async () => {
    const firstSignIn = useCase.execute({ id_token: aliceToken });
    const secondSignIn = useCase.execute({ id_token: aliceToken });

    const outputs = await Promise.all([firstSignIn, secondSignIn]);

    expect(storedAccounts()).toHaveLength(1);
    const firstAccountId = accountIdOf(outputs[0].access_token);
    expect(accountIdOf(outputs[1].access_token)).toBe(firstAccountId);
  });
});
