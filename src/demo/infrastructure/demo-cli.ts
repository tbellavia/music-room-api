import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { DemoSeeder } from './demo-seeder';

// Entry point of `make seed` and `make seed-clean`, run inside the api
// container: node dist/demo/infrastructure/demo-cli.js seed|clean
async function run(): Promise<void> {
  const command = process.argv[2];
  const logger = new Logger('DemoCli');
  if (command !== 'seed' && command !== 'clean') {
    logger.error('Usage: demo-cli seed|clean');
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const demoSeeder = app.get(DemoSeeder);
  try {
    if (command === 'seed') {
      await demoSeeder.reseed();
    } else {
      await demoSeeder.remove();
    }
  } catch (error) {
    logger.error(String(error));
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}
void run();
