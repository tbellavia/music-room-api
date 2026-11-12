import {
  GoogleIdentity,
  GoogleTokenVerifier,
} from 'src/identity/application/ports/google-token-verifier';
import { InvalidGoogleToken } from 'src/identity/domain/errors/invalid-google-token.error';

// Test double for use-case specs: only the tokens registered with `accept` are valid
export class InMemoryGoogleTokenVerifier implements GoogleTokenVerifier {
  private readonly identities = new Map<string, GoogleIdentity>();

  accept(idToken: string, identity: GoogleIdentity): void {
    this.identities.set(idToken, identity);
  }

  verify(idToken: string): Promise<GoogleIdentity> {
    const identity = this.identities.get(idToken);
    if (!identity) {
      return Promise.reject(new InvalidGoogleToken());
    }
    return Promise.resolve(identity);
  }
}
