import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { PasswordResetRepository } from 'src/identity/application/ports/password-reset.repository';
import { PasswordReset } from 'src/identity/domain/password-reset.entity';
import { PasswordResetOrmEntity } from './typeorm-password-reset.entity';

@Injectable()
export class TypeOrmPasswordResetRepository implements PasswordResetRepository {
  constructor(
    @InjectRepository(PasswordResetOrmEntity)
    private readonly repository: Repository<PasswordResetOrmEntity>,
  ) {}

  async findByAccountId(accountId: string): Promise<PasswordReset | null> {
    const entity = await this.repository.findOneBy({ account_id: accountId });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  // The account id is the primary key: saving replaces the previous reset
  async save(reset: PasswordReset): Promise<void> {
    await this.repository.save(this.toOrm(reset));
  }

  // A single UPDATE ... WHERE attempts < max: the check and the increment
  // cannot be interleaved by another request
  async consumeAttempt(
    accountId: string,
    maxAttempts: number,
  ): Promise<boolean> {
    const result = await this.repository.increment(
      { account_id: accountId, attempts: LessThan(maxAttempts) },
      'attempts',
      1,
    );

    return result.affected === 1;
  }

  // A single DELETE ... WHERE code_hash = ? AND expires_at >= now: among
  // parallel requests with the right code, only one deletes the row
  async consumeCode(
    accountId: string,
    codeHash: string,
    now: Date,
  ): Promise<boolean> {
    const result = await this.repository.delete({
      account_id: accountId,
      code_hash: codeHash,
      expires_at: MoreThanOrEqual(now),
    });

    return result.affected === 1;
  }

  private toDomain(orm: PasswordResetOrmEntity): PasswordReset {
    return new PasswordReset(
      orm.account_id,
      orm.code_hash,
      orm.expires_at,
      orm.sent_at,
      orm.attempts,
    );
  }

  private toOrm(reset: PasswordReset): PasswordResetOrmEntity {
    return {
      account_id: reset.accountId,
      code_hash: reset.codeHash,
      expires_at: reset.expiresAt,
      sent_at: reset.sentAt,
      attempts: reset.attempts,
    };
  }
}
