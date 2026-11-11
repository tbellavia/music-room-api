import { Logger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createValidationPipe } from './interface/http/validation/validation-pipe';
import { createRequestLogger } from './interface/http/middleware/request-logger.middleware';
import { translateRequestBodyError } from './interface/http/middleware/request-body-error.middleware';
import { API_PREFIX } from './shared/constants';
import { isE2eMode } from './infrastructure/config/e2e-mode';

const PRODUCTION_LOG_LEVELS: LogLevel[] = ['error', 'warn', 'log'];
const DEVELOPMENT_LOG_LEVELS: LogLevel[] = [
  'error',
  'warn',
  'log',
  'debug',
  'verbose',
];

// Read before the app exists: the levels must be known to log the bootstrap
function logLevels(): LogLevel[] {
  const isDevelopment = process.env.ENVIRONMENT === 'dev';

  if (isDevelopment) {
    return DEVELOPMENT_LOG_LEVELS;
  }
  return PRODUCTION_LOG_LEVELS;
}

async function bootstrap() {
  // The JSON parser is registered below, followed by its error translation
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: logLevels(),
    bodyParser: false,
  });
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(createValidationPipe());
  app.use(createRequestLogger(new Logger('HTTP')));
  app.useBodyParser('json');
  app.use(translateRequestBodyError);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const environment = process.env.ENVIRONMENT ?? 'prod';
  logger.log(`API listening on port ${port} (env=${environment})`);

  const config = app.get(ConfigService);
  if (isE2eMode(config)) {
    logger.warn(
      'E2E MODE: verification emails are NOT sent, codes are logged. Run `make start` to go back to normal mode',
    );
  }
}
void bootstrap();
