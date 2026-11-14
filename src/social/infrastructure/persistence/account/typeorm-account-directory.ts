import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountOrmEntity } from 'src/identity/infrastructure/persistence/typeorm-account.entity';
import { AccountDirectory } from 'src/social/application/ports/account-directory';

@Injectable()
export class TypeOrmAccountDirectory implements AccountDirectory {
  constructor(
    @InjectRepository(AccountOrmEntity)
    private readonly repository: Repository<AccountOrmEntity>,
  ) {}

  async exists(accountId: string): Promise<boolean> {
    return await this.repository.existsBy({ id: accountId });
  }
}
