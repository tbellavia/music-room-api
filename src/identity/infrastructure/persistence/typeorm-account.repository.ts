import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../../application/ports/account.repository';
import { Account } from '../../domain/account.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ACCOUNT_EMAIL_UNIQUE_CONSTRAINT,
  ACCOUNT_USERNAME_UNIQUE_CONSTRAINT,
  AccountOrmEntity,
} from './typeorm-account.entity';
import { LessThan, Repository } from 'typeorm';
import { EmailAlreadyExists } from '../../domain/errors/email-already-exists.error';
import { UsernameAlreadyExists } from '../../domain/errors/username-already-exists.error';
import { violatedUniqueConstraint } from '../../../infrastructure/database/error-utils';

@Injectable()
export class TypeOrmAccountRepository implements AccountRepository {
  constructor(
    @InjectRepository(AccountOrmEntity)
    private readonly repository: Repository<AccountOrmEntity>,
  ) {}

  async findByEmail(email: string): Promise<Account | null> {
    const entity = await this.repository.findOneBy({ email });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  async findById(id: string): Promise<Account | null> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async save(account: Account): Promise<void> {
    try {
      await this.repository.save(this.toOrm(account));
    } catch (error) {
      // Two registrations racing on the same email or username
      const constraint = violatedUniqueConstraint(error);
      if (constraint === ACCOUNT_EMAIL_UNIQUE_CONSTRAINT) {
        throw new EmailAlreadyExists();
      }
      if (constraint === ACCOUNT_USERNAME_UNIQUE_CONSTRAINT) {
        throw new UsernameAlreadyExists();
      }
      throw error;
    }
  }

  async findByUsername(username: string): Promise<Account | null> {
    const entity = await this.repository.findOneBy({ username });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  async findByGoogleId(googleId: string): Promise<Account | null> {
    const entity = await this.repository.findOneBy({ google_id: googleId });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  // A single UPDATE ... WHERE otp_attempts < max: the check and the increment
  // cannot be interleaved by another request
  async consumeOtpAttempt(
    accountId: string,
    maxAttempts: number,
  ): Promise<boolean> {
    const result = await this.repository.increment(
      { id: accountId, otp_attempts: LessThan(maxAttempts) },
      'otp_attempts',
      1,
    );

    return result.affected === 1;
  }

  private toDomain(orm: AccountOrmEntity): Account {
    return new Account(
      orm.id,
      orm.username,
      orm.email,
      orm.password,
      orm.otp_code,
      orm.otp_expiry,
      orm.otp_sent_at,
      orm.otp_attempts,
      orm.is_active,
      orm.auth_method,
      orm.google_id,
    );
  }

  private toOrm(account: Account): AccountOrmEntity {
    return {
      id: account.id,
      username: account.username,
      email: account.email,
      password: account.password,
      otp_code: account.otp_code,
      otp_expiry: account.otp_expiry,
      otp_sent_at: account.otp_sent_at,
      otp_attempts: account.otp_attempts,
      is_active: account.is_active,
      auth_method: account.auth_method,
      google_id: account.google_id,
    };
  }
}
