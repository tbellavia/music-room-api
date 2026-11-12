export type GoogleIdentity = {
  googleId: string;
  email: string;
};

export interface GoogleTokenVerifier {
  // Throws InvalidGoogleToken when the token is not a valid Google ID token
  // issued for this API, or when its email is not verified by Google
  verify(idToken: string): Promise<GoogleIdentity>;
}

export const GOOGLE_TOKEN_VERIFIER = Symbol('GoogleTokenVerifier');
