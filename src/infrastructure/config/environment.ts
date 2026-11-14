import { ConfigService } from '@nestjs/config';

// Dev mode is only enabled by `make dev`: the dev accounts exist and the JWT
// guard accepts their long-lived tokens
export function isDevelopmentMode(config: ConfigService): boolean {
  return config.get<string>('ENVIRONMENT') === 'dev';
}
