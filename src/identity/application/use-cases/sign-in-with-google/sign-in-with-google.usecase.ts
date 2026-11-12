import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomInt, randomUUID } from 'crypto';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from '../../ports/account.repository';
import {
  GOOGLE_TOKEN_VERIFIER,
  GoogleIdentity,
  GoogleTokenVerifier,
} from '../../ports/google-token-verifier';
import { signAccessToken } from '../../access-token';
import { Account } from 'src/identity/domain/account.entity';
import { EmailAlreadyExists } from 'src/identity/domain/errors/email-already-exists.error';
import { UsernameAlreadyExists } from 'src/identity/domain/errors/username-already-exists.error';
import {
  GENERATED_USERNAME_SUFFIX_LENGTH,
  usernameFromEmail,
  usernameWithSuffix,
} from 'src/identity/domain/generated-username';
import {
  SignInWithGoogleInput,
  SignInWithGoogleOutput,
} from './sign-in-with-google.contracts';

// The first try uses the bare username, the next ones add a random suffix
const MAX_USERNAME_TRIES = 5;
const SUFFIX_UPPER_BOUND = 10 ** GENERATED_USERNAME_SUFFIX_LENGTH;

@Injectable()
export class SignInWithGoogleUseCase {
  private readonly logger = new Logger(SignInWithGoogleUseCase.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly repository: AccountRepository,
    @Inject(GOOGLE_TOKEN_VERIFIER)
    private readonly googleTokenVerifier: GoogleTokenVerifier,
    private readonly jwtService: JwtService,
  ) {}

  // Signs in, and creates the account on the first sign-in
  async execute(input: SignInWithGoogleInput): Promise<SignInWithGoogleOutput> {
    const identity = await this.googleTokenVerifier.verify(input.id_token);

    const existingAccount = await this.repository.findByGoogleId(
      identity.googleId,
    );
    if (existingAccount) {
      return this.signIn(existingAccount);
    }

    // Not linked automatically: a local account may have been created with
    // this email by someone who does not own it
    const accountWithSameEmail = await this.repository.findByEmail(
      identity.email,
    );
    if (accountWithSameEmail) {
      throw new EmailAlreadyExists();
    }

    const createdAccount = await this.createAccount(identity);
    return this.signIn(createdAccount);
  }

  private async createAccount(identity: GoogleIdentity): Promise<Account> {
    const baseUsername = usernameFromEmail(identity.email);

    for (let attempt = 0; attempt < MAX_USERNAME_TRIES; attempt++) {
      const username = this.usernameForAttempt(baseUsername, attempt);
      const account = Account.google({
        id: randomUUID(),
        username,
        email: identity.email,
        google_id: identity.googleId,
      });

      try {
        await this.repository.save(account);
        this.logger.log(`Google account created account=${account.id}`);
        return account;
      } catch (error) {
        if (!(error instanceof UsernameAlreadyExists)) {
          return this.accountCreatedInParallel(identity, error);
        }
      }
    }
    throw new UsernameAlreadyExists();
  }

  private usernameForAttempt(baseUsername: string, attempt: number): string {
    if (attempt === 0) {
      return baseUsername;
    }
    const suffix = randomInt(SUFFIX_UPPER_BOUND);
    return usernameWithSuffix(baseUsername, suffix);
  }

  // Two first sign-ins of the same Google account at the same time: the second
  // save violates the unique email or google id. The account exists by now.
  private async accountCreatedInParallel(
    identity: GoogleIdentity,
    saveError: unknown,
  ): Promise<Account> {
    const account = await this.repository.findByGoogleId(identity.googleId);
    if (!account) {
      throw saveError;
    }
    return account;
  }

  private signIn(account: Account): SignInWithGoogleOutput {
    this.logger.log(`Account signed in with Google account=${account.id}`);

    return {
      access_token: signAccessToken(this.jwtService, account),
    };
  }
}
