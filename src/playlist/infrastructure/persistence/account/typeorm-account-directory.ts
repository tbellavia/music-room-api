import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AccountOrmEntity } from 'src/identity/infrastructure/persistence/typeorm-account.entity';
import {
  AccountDirectory,
  AccountSummary,
} from 'src/playlist/application/ports/account-directory';

@Injectable()
export class TypeOrmAccountDirectory implements AccountDirectory {
  constructor(
    @InjectRepository(AccountOrmEntity)
    private readonly repository: Repository<AccountOrmEntity>,
  ) {}

  async findById(id: string): Promise<AccountSummary | null> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      return null;
    }
    return this.toSummary(entity);
  }

  async findByIds(ids: string[]): Promise<AccountSummary[]> {
    if (ids.length === 0) {
      return [];
    }
    const entities = await this.repository.findBy({ id: In(ids) });

    return entities.map((entity) => this.toSummary(entity));
  }

  // Only expose what other users may see: never the email or the password
  private toSummary(orm: AccountOrmEntity): AccountSummary {
    return {
      id: orm.id,
      username: orm.username,
    };
  }
}
