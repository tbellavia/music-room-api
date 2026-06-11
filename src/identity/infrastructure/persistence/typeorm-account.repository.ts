import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../../application/ports/account.repository';
import { Account } from '../../domain/account.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { AccountOrmEntity } from './typeorm-account.entity';
import { Repository } from 'typeorm';
import { AccountAlreadyExistsError } from '../../domain/errors/account-already-exists.error';
import { isUniqueViolation } from '../../../infrastructure/database/error-utils';

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

  async save(account: Account): Promise<void> {
    try {
      await this.repository.save(this.toOrm(account));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AccountAlreadyExistsError();
      }
    }
  }

  private toDomain(orm: AccountOrmEntity): Account {
    return new Account(
      orm.id,
      orm.username,
      orm.email,
      orm.password,
      orm.auth_method,
    );
  }

  private toOrm(account: Account): AccountOrmEntity {
    return {
      id: account.id,
      username: account.username,
      email: account.email,
      password: account.password,
      auth_method: account.auth_method,
    };
  }
}
