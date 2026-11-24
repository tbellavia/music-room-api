import { randomUUID } from 'crypto';
import { fakerFR as faker } from '@faker-js/faker';
import { Coordinates } from 'src/playlist/domain/geo';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { MusicInfos } from 'src/playlist/domain/track.entity';
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from 'src/shared/constants';
import { DEMO_MUSIC } from './demo-music-library';
import {
  DEMO_GUEST,
  DEMO_OWNER,
  DemoAccountInfos,
  FIXED_DEMO_ACCOUNTS,
  demoAccount,
} from './demo-accounts';
import {
  DAY,
  DemoContent,
  DemoFriendship,
  DemoFriendshipRequest,
  DemoParticipant,
  DemoPlaylist,
  HOUR,
  TrackDraft,
  before,
  tracks,
} from './demo-data';

// Random demo data (SEED_COUNT), new at every seed. faker gives the raw
// material (names, places, dates, random picks); the rules of the API that the
// data must follow are written here.

// Above it, the seed would outlast the startup healthcheck of the container
export const DEMO_MAX_GENERATED_ACCOUNTS = 200;
// One generated playlist for this many generated accounts
const ACCOUNTS_PER_PLAYLIST = 2;
const FRIENDS_PER_ACCOUNT = 3;
const ACCOUNTS_PER_FRIENDSHIP_REQUEST = 3;
// VOTE parties are spread around the origin, up to this distance
const PARTY_RADIUS_KILOMETERS = 20;
// The live party of demo.owner: close enough to join it from the origin
const NEARBY_RADIUS_KILOMETERS = 0.2;
const ALL_MUSIC: MusicInfos[] = Object.values(DEMO_MUSIC);

export type DemoGeneratorOptions = {
  // Generated accounts, on top of demo.owner and demo.guest
  size: number;
  // Dates are relative to it: a "live" party is live when the seed runs
  now: Date;
  // Where the VOTE parties take place (42 Paris by default)
  origin: Coordinates;
  // dev1 and dev2 in dev mode: they get the same content as demo.guest
  devAccountIds: string[];
};

type Period = {
  beginAt: Date | null;
  endAt: Date | null;
};

// Everything a playlist is generated from
type PlaylistPlan = {
  ownerId: string;
  name: string;
  description: string;
  type: PlaylistType;
  isPrivate: boolean;
  license: PlaylistLicense;
  period: Period;
  // VOTE only: how far from the origin the party takes place
  radiusKilometers: number;
  // Accounts that may be picked as members or invitees
  candidateIds: string[];
  // Always members or invited, on top of the picked ones
  memberIds: string[];
  inviteeIds: string[];
};

export function generateDemo(options: DemoGeneratorOptions): DemoContent {
  const generated = generateAccounts(options.size);
  const generatedIds = generated.map((account) => account.id);
  const guestIds = [DEMO_GUEST.id, ...options.devAccountIds];

  const plans = [
    ...showcasePlans(options.now, guestIds, generatedIds),
    ...randomPlans(options.now, generated, [...generatedIds, ...guestIds]),
  ];
  const friendships = [
    ...guestIds.map((guestId) => ({ userA: DEMO_OWNER.id, userB: guestId })),
    ...generateFriendships(generatedIds),
  ];

  return {
    accounts: [...FIXED_DEMO_ACCOUNTS, ...generated],
    friendships,
    friendshipRequests: generateFriendshipRequests(
      generatedIds,
      guestIds,
      friendships,
    ),
    playlists: plans.map((plan) => generatePlaylist(plan, options)),
  };
}

function generateAccounts(size: number): DemoAccountInfos[] {
  const usernames = new Set<string>();
  const accounts: DemoAccountInfos[] = [];
  while (accounts.length < size) {
    const username = faker.internet.username().toLowerCase();
    const isValid =
      username.length >= USERNAME_MIN_LENGTH &&
      username.length <= USERNAME_MAX_LENGTH;
    if (isValid && !usernames.has(username)) {
      usernames.add(username);
      const number = FIXED_DEMO_ACCOUNTS.length + accounts.length + 1;
      accounts.push(demoAccount(number, username));
    }
  }
  return accounts;
}

// The playlists of demo.owner: one of each kind, to show every rule during
// the defense. The guests can join the live party on site, are members of the
// collaborative playlist and invited to the private project.
function showcasePlans(
  now: Date,
  guestIds: string[],
  generatedIds: string[],
): PlaylistPlan[] {
  const base = {
    ownerId: DEMO_OWNER.id,
    isPrivate: false,
    license: PlaylistLicense.EVERYONE,
    radiusKilometers: PARTY_RADIUS_KILOMETERS,
    candidateIds: generatedIds,
    memberIds: [],
    inviteeIds: [],
  };
  return [
    {
      ...base,
      name: 'Soirée en cours',
      description: 'En cours, juste à côté : on peut la rejoindre sur place',
      type: PlaylistType.VOTE,
      period: livePeriod(now),
      radiusKilometers: NEARBY_RADIUS_KILOMETERS,
    },
    {
      ...base,
      name: 'Soirée à venir',
      description: 'Pas encore commencée : seul l’owner la prépare',
      type: PlaylistType.VOTE,
      period: upcomingPeriod(now),
    },
    {
      ...base,
      name: 'Soirée terminée',
      description: 'Terminée : son historique reste visible',
      type: PlaylistType.VOTE,
      period: endedPeriod(now),
    },
    {
      ...base,
      name: 'Playlist collaborative',
      description: 'Chacun ajoute et déplace les musiques',
      type: PlaylistType.EDITOR,
      period: { beginAt: null, endAt: null },
      memberIds: guestIds,
    },
    {
      ...base,
      name: 'Projet privé',
      description: 'Privée, sur invitation seulement',
      type: PlaylistType.EDITOR,
      isPrivate: true,
      license: PlaylistLicense.INVITED_ONLY,
      period: { beginAt: null, endAt: null },
      inviteeIds: guestIds,
    },
  ];
}

function randomPlans(
  now: Date,
  owners: DemoAccountInfos[],
  candidateIds: string[],
): PlaylistPlan[] {
  const count = Math.floor(owners.length / ACCOUNTS_PER_PLAYLIST);
  const names = new Set<string>();
  const plans: PlaylistPlan[] = [];
  while (plans.length < count) {
    const owner = faker.helpers.arrayElement(owners);
    const isVote = faker.datatype.boolean({ probability: 0.6 });
    const genre = faker.music.genre().toLowerCase();
    const name = isVote ? partyName(genre) : editorName(genre);
    // A playlist name is unique per owner
    const key = `${owner.id}|${name}`;
    if (names.has(key)) {
      continue;
    }
    names.add(key);

    const hasPeriod = isVote || faker.datatype.boolean();
    plans.push({
      ownerId: owner.id,
      name,
      description: `Ambiance ${genre}, ${faker.word.adjective()}`,
      type: isVote ? PlaylistType.VOTE : PlaylistType.EDITOR,
      isPrivate: faker.datatype.boolean({ probability: 0.2 }),
      license: faker.helpers.weightedArrayElement([
        { weight: 3, value: PlaylistLicense.EVERYONE },
        { weight: 1, value: PlaylistLicense.INVITED_ONLY },
      ]),
      period: hasPeriod ? randomPeriod(now) : { beginAt: null, endAt: null },
      radiusKilometers: PARTY_RADIUS_KILOMETERS,
      candidateIds: candidateIds.filter((id) => id !== owner.id),
      memberIds: [],
      inviteeIds: [],
    });
  }
  return plans;
}

function partyName(genre: string): string {
  const firstName = faker.person.firstName();
  const age = faker.number.int({ min: 18, max: 40 });
  return faker.helpers.arrayElement([
    `Soirée ${genre} chez ${firstName}`,
    `${firstName} fête ses ${age} ans`,
    `Nuit ${genre} à ${faker.location.city()}`,
  ]);
}

function editorName(genre: string): string {
  const firstName = faker.person.firstName();
  return faker.helpers.arrayElement([
    `Road trip ${genre}`,
    `Les classiques ${genre} de ${firstName}`,
    `Session ${genre} du ${faker.date.weekday()}`,
  ]);
}

function generatePlaylist(
  plan: PlaylistPlan,
  options: DemoGeneratorOptions,
): DemoPlaylist {
  const { now } = options;
  const hasBegun = plan.period.beginAt === null || plan.period.beginAt <= now;
  const isVote = plan.type === PlaylistType.VOTE;

  const forcedIds = [...plan.memberIds, ...plan.inviteeIds];
  const candidateIds = plan.candidateIds.filter(
    (id) => !forcedIds.includes(id),
  );
  const pickedMemberIds = faker.helpers.arrayElements(candidateIds, {
    min: Math.min(2, candidateIds.length),
    max: 8,
  });
  // Joining needs a public playlist that has begun: the others were invited
  const canHaveJoined = !plan.isPrivate && hasBegun;
  const participants: DemoParticipant[] = [
    ...plan.memberIds,
    ...pickedMemberIds,
  ].map((accountId) => ({
    accountId,
    joinedVia: joinMethod(canHaveJoined, plan.license),
    hasPrivilege: faker.datatype.boolean({ probability: 0.15 }),
  }));

  const nonMemberIds = candidateIds.filter(
    (id) => !pickedMemberIds.includes(id),
  );
  const inviteeIds = [
    ...plan.inviteeIds,
    ...faker.helpers.arrayElements(nonMemberIds, { min: 0, max: 2 }),
  ];

  // Before a VOTE party begins, only its owner prepares it
  const actorIds =
    isVote && !hasBegun
      ? [plan.ownerId]
      : trackActorIds(plan.ownerId, participants, plan.license);
  const drafts = trackDrafts(isVote, hasBegun, actorIds);
  const firstAddition =
    plan.period.beginAt !== null && plan.period.beginAt <= now
      ? plan.period.beginAt
      : before(now, drafts);

  return {
    infos: {
      id: randomUUID(),
      type: plan.type,
      ownerId: plan.ownerId,
      name: plan.name,
      description: plan.description,
      isPrivate: plan.isPrivate,
      license: plan.license,
      beginAt: plan.period.beginAt,
      endAt: plan.period.endAt,
      ...(isVote ? partyPlace(options.origin, plan.radiusKilometers) : {}),
      createdAt: faker.date.recent({ days: 30, refDate: now }),
    },
    participants,
    invitations: inviteeIds.map((inviteeId) => ({
      inviterId: plan.ownerId,
      inviteeId,
    })),
    tracks: tracks(drafts, firstAddition, now),
  };
}

// Began up to 3 hours ago, ends in 2 to 5 hours
function livePeriod(now: Date): Period {
  const beginAt = faker.date.recent({ days: 3 / 24, refDate: now });
  const duration = faker.number.int({ min: 2, max: 5 }) * HOUR;
  return { beginAt, endAt: new Date(now.getTime() + duration) };
}

function upcomingPeriod(now: Date): Period {
  const beginAt = faker.date.soon({ days: 14, refDate: now });
  return { beginAt, endAt: endOfParty(beginAt) };
}

function endedPeriod(now: Date): Period {
  const beginAt = faker.date.recent({
    days: 7,
    refDate: new Date(now.getTime() - DAY),
  });
  return { beginAt, endAt: endOfParty(beginAt) };
}

function endOfParty(beginAt: Date): Date {
  const duration = faker.number.int({ min: 2, max: 8 }) * HOUR;
  return new Date(beginAt.getTime() + duration);
}

function randomPeriod(now: Date): Period {
  const period = faker.helpers.arrayElement([
    livePeriod,
    upcomingPeriod,
    endedPeriod,
  ]);
  return period(now);
}

function partyPlace(
  origin: Coordinates,
  radiusKilometers: number,
): Coordinates & { address: string } {
  const [latitude, longitude] = faker.location.nearbyGPSCoordinate({
    origin: [origin.latitude, origin.longitude],
    radius: radiusKilometers,
    isMetric: true,
  });
  return {
    latitude,
    longitude,
    address: `${faker.location.streetAddress()}, Paris`,
  };
}

function joinMethod(
  canHaveJoined: boolean,
  license: PlaylistLicense,
): JoinMethod {
  if (!canHaveJoined) {
    return JoinMethod.INVITATION;
  }
  const invitationRate = license === PlaylistLicense.INVITED_ONLY ? 0.7 : 0.2;
  return faker.datatype.boolean({ probability: invitationRate })
    ? JoinMethod.INVITATION
    : JoinMethod.JOIN;
}

// The license decides who adds tracks and votes
function trackActorIds(
  ownerId: string,
  participants: DemoParticipant[],
  license: PlaylistLicense,
): string[] {
  const allowedParticipants = participants.filter(
    (participant) =>
      license === PlaylistLicense.EVERYONE ||
      participant.joinedVia === JoinMethod.INVITATION,
  );
  return [
    ownerId,
    ...allowedParticipants.map((participant) => participant.accountId),
  ];
}

function trackDrafts(
  isVote: boolean,
  hasBegun: boolean,
  actorIds: string[],
): TrackDraft[] {
  const musics = faker.helpers.arrayElements(ALL_MUSIC, { min: 3, max: 12 });
  // The first tracks of a running or past party were already played
  const playedCount = isVote && hasBegun ? Math.floor(musics.length * 0.2) : 0;

  return musics.map((music, index) => ({
    music,
    addedBy: faker.helpers.arrayElement(actorIds),
    voterIds: isVote
      ? actorIds.filter(() => faker.datatype.boolean({ probability: 0.35 }))
      : [],
    played: index < playedCount,
  }));
}

function pairKey(first: string, second: string): string {
  return [first, second].sort().join('|');
}

function generateFriendships(accountIds: string[]): DemoFriendship[] {
  const keys = new Set<string>();
  const friendships: DemoFriendship[] = [];
  for (const accountId of accountIds) {
    const others = accountIds.filter((id) => id !== accountId);
    for (const friendId of faker.helpers.arrayElements(
      others,
      FRIENDS_PER_ACCOUNT,
    )) {
      const key = pairKey(accountId, friendId);
      if (!keys.has(key)) {
        keys.add(key);
        friendships.push({ userA: accountId, userB: friendId });
      }
    }
  }
  return friendships;
}

// Each guest receives one, from a generated account. Never between two
// friends, at most one per pair.
function generateFriendshipRequests(
  generatedIds: string[],
  guestIds: string[],
  friendships: DemoFriendship[],
): DemoFriendshipRequest[] {
  const takenKeys = new Set(
    friendships.map((friendship) =>
      pairKey(friendship.userA, friendship.userB),
    ),
  );
  const requests: DemoFriendshipRequest[] = [];
  const addRequest = (senderId: string, receiverId: string) => {
    const key = pairKey(senderId, receiverId);
    if (!takenKeys.has(key)) {
      takenKeys.add(key);
      requests.push({ senderId, receiverId });
    }
  };

  if (generatedIds.length > 0) {
    for (const guestId of guestIds) {
      addRequest(faker.helpers.arrayElement(generatedIds), guestId);
    }
  }
  const count = Math.floor(
    generatedIds.length / ACCOUNTS_PER_FRIENDSHIP_REQUEST,
  );
  if (generatedIds.length >= 2) {
    for (let index = 0; index < count; index++) {
      const [senderId, receiverId] = faker.helpers.arrayElements(
        generatedIds,
        2,
      );
      addRequest(senderId, receiverId);
    }
  }
  return requests;
}
