// Fake users of the demo data. Their ids are fixed, like the dev accounts:
// removing the demo by id can never touch a real account with the same name.
export type DemoAccountInfos = {
  id: string;
  username: string;
  email: string;
};

// Nobody can receive mail there: the demo accounts are created already verified
const DEMO_EMAIL_DOMAIN = 'demo.music-room.local';

function demoAccount(number: number, username: string): DemoAccountInfos {
  const suffix = String(number).padStart(12, '0');
  return {
    id: `00000000-0000-4000-9000-${suffix}`,
    username,
    email: `${username}@${DEMO_EMAIL_DOMAIN}`,
  };
}

export const LEA = demoAccount(1, 'lea.dj');
export const KARIM = demoAccount(2, 'karim.beats');
export const SOFIA = demoAccount(3, 'sofia.indie');
export const HUGO = demoAccount(4, 'hugo.rock');
export const INES = demoAccount(5, 'ines.jazz');
export const TOM = demoAccount(6, 'tom.electro');
export const MAYA = demoAccount(7, 'maya.pop');
export const YANIS = demoAccount(8, 'yanis.rap');
export const CHLOE = demoAccount(9, 'chloe.soul');
export const NATHAN = demoAccount(10, 'nathan.metal');
export const EMMA = demoAccount(11, 'emma.folk');
export const LUCAS = demoAccount(12, 'lucas.house');

export const DEMO_ACCOUNTS: DemoAccountInfos[] = [
  LEA,
  KARIM,
  SOFIA,
  HUGO,
  INES,
  TOM,
  MAYA,
  YANIS,
  CHLOE,
  NATHAN,
  EMMA,
  LUCAS,
];
