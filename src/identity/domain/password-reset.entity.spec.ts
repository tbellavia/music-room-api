import { PasswordReset } from './password-reset.entity';

const sentAt = new Date('2026-01-01T12:00:00Z');
const justBeforeCooldownEnd = new Date('2026-01-01T12:00:59Z');
const cooldownEnd = new Date('2026-01-01T12:01:00Z');

const reset = PasswordReset.create({
  accountId: 'account-id',
  codeHash: 'code-hash',
  expiresAt: new Date('2026-01-01T12:15:00Z'),
  sentAt,
});

describe('PasswordReset', () => {
  it('starts without any attempt', () => {
    expect(reset.attempts).toBe(0);
  });

  it('refuses a new code before the end of the cooldown', () => {
    expect(reset.isRenewTooSoon(justBeforeCooldownEnd)).toBe(true);
  });

  it('accepts a new code once the cooldown is over', () => {
    expect(reset.isRenewTooSoon(cooldownEnd)).toBe(false);
  });
});
