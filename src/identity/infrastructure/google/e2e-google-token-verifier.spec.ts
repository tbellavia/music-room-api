import { InvalidGoogleToken } from 'src/identity/domain/errors/invalid-google-token.error';
import { E2eGoogleTokenVerifier } from './e2e-google-token-verifier';

describe('E2eGoogleTokenVerifier', () => {
  const verifier = new E2eGoogleTokenVerifier();

  it('reads the google id and the email of an e2e token', async () => {
    const identity = await verifier.verify('e2e:google-sub:alice@example.com');

    expect(identity).toEqual({
      googleId: 'google-sub',
      email: 'alice@example.com',
    });
  });

  it('rejects a token that does not follow the e2e format', async () => {
    const verification = verifier.verify('a-real-looking-token');

    await expect(verification).rejects.toThrow(InvalidGoogleToken);
  });

  it('rejects an e2e token without email', async () => {
    const verification = verifier.verify('e2e:google-sub:');

    await expect(verification).rejects.toThrow(InvalidGoogleToken);
  });
});
