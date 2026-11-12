import { USERNAME_MAX_LENGTH } from 'src/shared/constants';
import { usernameFromEmail, usernameWithSuffix } from './generated-username';

describe('usernameFromEmail', () => {
  it('keeps the part before the @', () => {
    const username = usernameFromEmail('alice@gmail.com');

    expect(username).toBe('alice');
  });

  it('keeps only lowercase letters and digits', () => {
    const username = usernameFromEmail('Alice.Martin+music_42@gmail.com');

    expect(username).toBe('alicemartinmusic');
  });

  it('leaves room for the suffix in a long email', () => {
    const longEmail = 'averyveryveryverylongname@gmail.com';

    const username = usernameFromEmail(longEmail);
    const usernameWithLongestSuffix = usernameWithSuffix(username, 9999);

    expect(usernameWithLongestSuffix.length).toBeLessThanOrEqual(
      USERNAME_MAX_LENGTH,
    );
  });

  it('falls back to "user" when too few letters remain', () => {
    const username = usernameFromEmail('a.b@gmail.com');

    expect(username).toBe('user');
  });
});

describe('usernameWithSuffix', () => {
  it('pads the suffix to always have 4 digits', () => {
    const username = usernameWithSuffix('alice', 42);

    expect(username).toBe('alice0042');
  });
});
