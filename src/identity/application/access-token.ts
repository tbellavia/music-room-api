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
