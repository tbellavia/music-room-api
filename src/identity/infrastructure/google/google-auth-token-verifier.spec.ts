import { LoginTicket, OAuth2Client, TokenPayload } from 'google-auth-library';
import { Logger } from '@nestjs/common';
import { InvalidGoogleToken } from 'src/identity/domain/errors/invalid-google-token.error';
import { GoogleAuthTokenVerifier } from './google-auth-token-verifier';

const ourClientId = 'our-client-id.apps.googleusercontent.com';
const idToken = 'google-id-token';

const verifiedPayload: TokenPayload = {
  iss: 'https://accounts.google.com',
  aud: ourClientId,
  sub: 'google-sub',
  email: 'alice@gmail.com',
  email_verified: true,
  iat: 0,
  exp: 0,
};

describe('GoogleAuthTokenVerifier', () => {
  let client: OAuth2Client;
  let verifyIdToken: jest.SpyInstance;
  let verifier: GoogleAuthTokenVerifier;

  function googleReturns(payload: TokenPayload) {
    const ticket = new LoginTicket(undefined, payload);
    verifyIdToken.mockResolvedValue(ticket);
  }

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    client = new OAuth2Client();
    verifyIdToken = jest.spyOn(client, 'verifyIdToken');
    verifier = new GoogleAuthTokenVerifier(ourClientId, client);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the google id and the email of a verified token', async () => {
    googleReturns(verifiedPayload);

    const identity = await verifier.verify(idToken);

    expect(identity).toEqual({
      googleId: 'google-sub',
      email: 'alice@gmail.com',
    });
  });

  it('asks Google to check that the token was issued for our client id', async () => {
    googleReturns(verifiedPayload);

    await verifier.verify(idToken);

    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken,
      audience: ourClientId,
    });
  });

  it('rejects a token refused by the library (signature, audience, expiry)', async () => {
    verifyIdToken.mockRejectedValue(new Error('Wrong recipient'));

    const verification = verifier.verify(idToken);

    await expect(verification).rejects.toThrow(InvalidGoogleToken);
  });

  it('rejects a token whose email is not verified by Google', async () => {
    googleReturns({ ...verifiedPayload, email_verified: false });

    const verification = verifier.verify(idToken);

    await expect(verification).rejects.toThrow(InvalidGoogleToken);
  });

  it('rejects a token without email', async () => {
    googleReturns({ ...verifiedPayload, email: undefined });

    const verification = verifier.verify(idToken);

    await expect(verification).rejects.toThrow(InvalidGoogleToken);
  });
});
