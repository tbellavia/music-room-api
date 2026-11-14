import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isDevelopmentMode } from 'src/infrastructure/config/environment';
import { EnsureDevAccountsUseCase } from 'src/identity/application/use-cases/ensure-dev-accounts/ensure-dev-accounts.usecase';
import { RemoveDevAccountsUseCase } from 'src/identity/application/use-cases/remove-dev-accounts/remove-dev-accounts.usecase';

// Runs before the API listens: in prod, the dev accounts are gone before the
// first request
@Injectable()
export class DevAccountsSeeder implements OnApplicationBootstrap {
  constructor(
    private readonly config: ConfigService,
    private readonly ensureDevAccounts: EnsureDevAccountsUseCase,
    private readonly removeDevAccounts: RemoveDevAccountsUseCase,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (isDevelopmentMode(this.config)) {
      await this.ensureDevAccounts.execute();
      return;
    }
    await this.removeDevAccounts.execute();
  }
}
