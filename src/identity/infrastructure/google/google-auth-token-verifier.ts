import { Logger } from '@nestjs/common';
import { LoginTicket, OAuth2Client } from 'google-auth-library';
import {
  GoogleIdentity,
  GoogleTokenVerifier,
} from 'src/identity/application/ports/google-token-verifier';
import { InvalidGoogleToken } from 'src/identity/domain/errors/invalid-google-token.error';

// Checks the signature with Google's public keys (fetched and cached by the
// library), the issuer, the expiry, and that the audience is our client ID:
// a token issued for another app is rejected.
export class GoogleAuthTokenVerifier implements GoogleTokenVerifier {
  private readonly logger = new Logger(GoogleAuthTokenVerifier.name);

  constructor(
    private readonly clientId: string,
    private readonly client: OAuth2Client = new OAuth2Client(),
  ) {}

  async verify(idToken: string): Promise<GoogleIdentity> {
    let ticket: LoginTicket;
    try {
      ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Google ID token rejected: ${reason}`);
      throw new InvalidGoogleToken();
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email || payload.email_verified !== true) {
      throw new InvalidGoogleToken();
    }

    return { googleId: payload.sub, email: payload.email };
  }
}
