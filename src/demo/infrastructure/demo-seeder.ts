import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SeedDemoUseCase } from 'src/demo/application/use-cases/seed-demo/seed-demo.usecase';
import { RemoveDemoUseCase } from 'src/demo/application/use-cases/remove-demo/remove-demo.usecase';
import { Coordinates } from 'src/playlist/domain/geo';

// Reads the demo settings (SEED_*) and runs the demo use cases, at startup or
// from the command line (make seed, make seed-clean)
@Injectable()
export class DemoSeeder {
  private readonly logger = new Logger(DemoSeeder.name);

  constructor(
    private readonly config: ConfigService,
    private readonly seedDemo: SeedDemoUseCase,
    private readonly removeDemo: RemoveDemoUseCase,
  ) {}

  // At startup: a failure is logged, the API must start anyway
  async seedIfMissing(): Promise<void> {
    // The end-to-end scripts count what they create: no demo in their way
    if (this.config.get<string>('ENVIRONMENT') === 'test') {
      return;
    }
    const password = this.seedPassword();
    if (password === null) {
      this.logger.warn('No demo data: SEED_PASSWORD is not set');
      return;
    }
    try {
      await this.seedDemo.execute({
        password,
        origin: this.origin(),
        crowdSize: this.crowdSize(),
        onlyIfMissing: true,
      });
    } catch (error) {
      this.logger.error(`Demo seed failed: ${String(error)}`);
    }
  }

  // From the command line: a failure must be seen, it is thrown
  async reseed(): Promise<void> {
    const password = this.seedPassword();
    if (password === null) {
      throw new Error('SEED_PASSWORD is not set in .env');
    }
    await this.seedDemo.execute({
      password,
      origin: this.origin(),
      crowdSize: this.crowdSize(),
      onlyIfMissing: false,
    });
  }

  async remove(): Promise<void> {
    const { removedAccounts } = await this.removeDemo.execute();
    this.logger.log(`Demo removed: ${removedAccounts} accounts`);
  }

  // docker compose passes an unset variable as an empty string
  private seedPassword(): string | null {
    const password = this.config.get<string>('SEED_PASSWORD');
    if (password === undefined || password === '') {
      return null;
    }
    return password;
  }

  private crowdSize(): number {
    return Number(this.config.getOrThrow<number>('SEED_COUNT'));
  }

  // Environment variables are strings until validated: converted to be sure
  private origin(): Coordinates {
    return {
      latitude: Number(this.config.getOrThrow<number>('SEED_LATITUDE')),
      longitude: Number(this.config.getOrThrow<number>('SEED_LONGITUDE')),
    };
  }
}
