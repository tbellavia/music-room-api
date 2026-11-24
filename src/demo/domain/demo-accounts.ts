// Fake users of the demo data. Their ids are reserved, like the dev accounts:
// removing the demo by id can never touch a real account with the same name.
export type DemoAccountInfos = {
  id: string;
  username: string;
  email: string;
};

// Reserved to the demo: real accounts have random ids
export const DEMO_ACCOUNT_ID_PREFIX = '00000000-0000-4000-900';

// Nobody can receive mail there: the demo accounts are created already verified
const DEMO_EMAIL_DOMAIN = 'demo.music-room.local';

export function demoAccount(
  number: number,
  username: string,
): DemoAccountInfos {
  const suffix = String(number).padStart(12, '0');
  return {
    id: `${DEMO_ACCOUNT_ID_PREFIX}0-${suffix}`,
    username,
    email: `${username}@${DEMO_EMAIL_DOMAIN}`,
  };
}

// The two accounts to log in with during the defense: the generated ones get
// a new username at every seed
export const DEMO_OWNER = demoAccount(1, 'demo.owner');
export const DEMO_GUEST = demoAccount(2, 'demo.guest');

export const FIXED_DEMO_ACCOUNTS: DemoAccountInfos[] = [DEMO_OWNER, DEMO_GUEST];
