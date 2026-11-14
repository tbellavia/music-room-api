import { JwtService } from '@nestjs/jwt';
import { Account } from 'src/identity/domain/account.entity';

// Same token whatever the sign-in method: the guard only knows our JWT
export function signAccessToken(
  jwtService: JwtService,
  account: Account,
): string {
  const payload = { sub: account.id, username: account.username };

  return jwtService.sign(payload);
}

// Dev accounts only: long enough not to sign in again during development.
// Rejected by the guard outside dev mode.
export const DEV_ACCESS_TOKEN_LIFETIME = '30d';

export function signDevAccessToken(
  jwtService: JwtService,
  account: Account,
): string {
  const payload = { sub: account.id, username: account.username, dev: true };

  return jwtService.sign(payload, { expiresIn: DEV_ACCESS_TOKEN_LIFETIME });
}
