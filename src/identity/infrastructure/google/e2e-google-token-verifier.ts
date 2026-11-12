import {
  GoogleIdentity,
  GoogleTokenVerifier,
} from 'src/identity/application/ports/google-token-verifier';
import { InvalidGoogleToken } from 'src/identity/domain/errors/invalid-google-token.error';

const E2E_TOKEN_PATTERN = /^e2e:([^:]+):([^:]+@[^:]+)$/;

// E2E mode only (forbidden in production): the end-to-end scripts cannot get
// a real Google token, so they send `e2e:<google id>:<email>` instead
export class E2eGoogleTokenVerifier implements GoogleTokenVerifier {
  verify(idToken: string): Promise<GoogleIdentity> {
    const match = E2E_TOKEN_PATTERN.exec(idToken);
    if (!match) {
      return Promise.reject(new InvalidGoogleToken());
    }

    const googleId = match[1];
    const email = match[2];
    return Promise.resolve({ googleId, email });
  }
}
