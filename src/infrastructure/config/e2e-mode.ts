import { ConfigService } from '@nestjs/config';

// E2E mode is only enabled by `make test-e2e`: verification codes are logged
// instead of emailed, so that the end-to-end scripts can verify their accounts.
// Read as unknown: depending on the source, the value is a boolean or a string.
export function isE2eMode(config: ConfigService): boolean {
  const e2eMode: unknown = config.get('E2E_MODE');

  return e2eMode === true || e2eMode === 'true';
}
