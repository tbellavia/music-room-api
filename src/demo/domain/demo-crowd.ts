import { randomUUID } from 'crypto';
import { Coordinates } from 'src/playlist/domain/geo';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { MusicInfos } from 'src/playlist/domain/track.entity';
import { DEMO_MUSIC } from './demo-music-library';
import { DemoAccountInfos, crowdAccount } from './demo-accounts';
import {
  DAY,
  DemoFriendship,
  DemoFriendshipRequest,
  DemoInvitation,
  DemoParticipant,
  DemoPlaylist,
  HOUR,
  TrackDraft,
  before,
  offset,
  tracks,
} from './demo-data';

// Generated accounts and playlists on top of the scenario (SEED_COUNT), to fill
// the lists during the defense. The scenario tells the story, the crowd only
// adds volume: it never touches the scenario accounts or playlists.

// Above it, the seed would outlast the startup healthcheck of the container
export const DEMO_CROWD_MAX_ACCOUNTS = 300;
// One generated playlist for this many generated accounts
const ACCOUNTS_PER_PLAYLIST = 2;
const FRIENDS_PER_ACCOUNT = 3;
const ACCOUNTS_PER_FRIENDSHIP_REQUEST = 3;
// VOTE parties are spread around the origin, up to this distance
const CROWD_RADIUS_METERS = 20_000;
// Fixed: the same SEED_COUNT always gives the same crowd
const RANDOM_SEED = 42;

export type DemoCrowd = {
  accounts: DemoAccountInfos[];
  friendships: DemoFriendship[];
  friendshipRequests: DemoFriendshipRequest[];
  playlists: DemoPlaylist[];
};

export type DemoCrowdOptions = {
  // Number of generated accounts, at most DEMO_CROWD_MAX_ACCOUNTS
  size: number;
  now: Date;
  origin: Coordinates;
};

// None of the scenario first names: no generated username looks like a character
const FIRST_NAMES = [
  'camille',
  'noah',
  'jade',
  'louis',
  'alice',
  'gabriel',
  'rose',
  'arthur',
  'louise',
  'jules',
  'ambre',
  'adam',
  'lina',
  'raphael',
  'mia',
  'leo',
  'anna',
  'paul',
  'zoe',
  'sacha',
  'eva',
  'nino',
  'lou',
  'malo',
  'iris',
  'theo',
  'nina',
  'enzo',
  'clara',
  'axel',
  'julia',
  'victor',
  'sarah',
  'mathis',
  'lena',
  'oscar',
  'manon',
  'liam',
  'elise',
  'marius',
];

const STYLES = [
  'funk',
  'lofi',
  'disco',
  'techno',
  'reggae',
  'soul',
  'punk',
  'blues',
  'salsa',
  'kpop',
  'trap',
  'swing',
  'grunge',
  'synth',
  'dub',
  'gospel',
  'afro',
  'ska',
  'opera',
  'drill',
];

const STREETS = [
  'rue des Lilas',
  'rue de la Paix',
  'rue des Martyrs',
  'rue Oberkampf',
  'rue de Belleville',
  'rue Mouffetard',
  'rue de la Roquette',
  'rue Lepic',
  'rue des Abbesses',
  'rue de Charonne',
];

const VOTE_NAMES: ((style: string, ownerName: string) => string)[] = [
  (style, ownerName) => `Soirée ${style} chez ${ownerName}`,
  (style) => `${capitalized(style)} night`,
  (style) => `Apéro ${style}`,
  (style) => `Bal ${style} du quartier`,
  (style, ownerName) => `Anniversaire ${style} de ${ownerName}`,
];

const EDITOR_NAMES: ((style: string, ownerName: string) => string)[] = [
  (style) => `Road trip ${style}`,
  (style) => `${capitalized(style)} pour bosser`,
  (style, ownerName) => `Les pépites ${style} de ${ownerName}`,
  (style) => `Running ${style}`,
  (style) => `${capitalized(style)} du dimanche`,
];

const DESCRIPTIONS = [
  'Ajoutez vos sons préférés !',
  'Que du bon, promis.',
  'On vote, on danse.',
  '',
  'La playlist de la semaine.',
];

const ALL_MUSIC: MusicInfos[] = Object.values(DEMO_MUSIC);

// mulberry32: a few lines, good enough for demo data, and seedable
type Random = () => number;

function seededRandom(seed: number): Random {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function capitalized(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function integerBetween(random: Random, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function chance(random: Random, probability: number): boolean {
  return random() < probability;
}

function pick<T>(random: Random, items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

// `count` distinct items, in a random order
function pickSome<T>(random: Random, items: T[], count: number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const otherIndex = Math.floor(random() * (index + 1));
    const item = shuffled[index];
    shuffled[index] = shuffled[otherIndex];
    shuffled[otherIndex] = item;
  }
  return shuffled.slice(0, count);
}

function pairKey(first: string, second: string): string {
  return [first, second].sort().join('|');
}

export function buildDemoCrowd(options: DemoCrowdOptions): DemoCrowd {
  const random = seededRandom(RANDOM_SEED);
  const accounts = crowdAccounts(random, options.size);
  if (accounts.length < 2) {
    return { accounts, friendships: [], friendshipRequests: [], playlists: [] };
  }

  const playlistCount = Math.floor(accounts.length / ACCOUNTS_PER_PLAYLIST);
  const playlistNames = new Set<string>();
  const playlists: DemoPlaylist[] = [];
  for (let index = 0; index < playlistCount; index++) {
    playlists.push(crowdPlaylist(random, options, accounts, playlistNames));
  }

  const friendKeys = new Set<string>();
  return {
    accounts,
    friendships: crowdFriendships(random, accounts, friendKeys),
    friendshipRequests: crowdFriendshipRequests(random, accounts, friendKeys),
    playlists,
  };
}

function crowdAccounts(random: Random, size: number): DemoAccountInfos[] {
  const usernames = new Set<string>();
  const accounts: DemoAccountInfos[] = [];
  for (let number = 1; number <= size; number++) {
    const baseUsername = `${pick(random, FIRST_NAMES)}.${pick(random, STYLES)}`;
    let username = baseUsername;
    let duplicate = 2;
    while (usernames.has(username)) {
      username = `${baseUsername}${duplicate}`;
      duplicate = duplicate + 1;
    }
    usernames.add(username);
    accounts.push(crowdAccount(number, username));
  }
  return accounts;
}

function firstNameOf(account: DemoAccountInfos): string {
  const firstName = account.username.split('.')[0];
  return capitalized(firstName);
}

// The name of a playlist is unique per owner
function uniqueName(
  name: string,
  ownerId: string,
  playlistNames: Set<string>,
): string {
  let uniqueCandidate = name;
  let duplicate = 2;
  while (playlistNames.has(`${ownerId}|${uniqueCandidate}`)) {
    uniqueCandidate = `${name} #${duplicate}`;
    duplicate = duplicate + 1;
  }
  playlistNames.add(`${ownerId}|${uniqueCandidate}`);
  return uniqueCandidate;
}

type Period = {
  beginAt: Date | null;
  endAt: Date | null;
};

// From a week ago to two weeks ahead: a mix of live, upcoming and ended
function randomPeriod(random: Random, now: Date): Period {
  const beginOffset = integerBetween(random, -7 * 24, 14 * 24) * HOUR;
  const beginAt = new Date(now.getTime() + beginOffset);
  const duration = integerBetween(random, 2, 8) * HOUR;
  return { beginAt, endAt: new Date(beginAt.getTime() + duration) };
}

// Uniform over the disc: the square root keeps the center from being crowded
function randomLocation(random: Random, origin: Coordinates): Coordinates {
  const distance = CROWD_RADIUS_METERS * Math.sqrt(random());
  const angle = random() * 2 * Math.PI;
  return offset(origin, distance * Math.cos(angle), distance * Math.sin(angle));
}

function crowdPlaylist(
  random: Random,
  options: DemoCrowdOptions,
  accounts: DemoAccountInfos[],
  playlistNames: Set<string>,
): DemoPlaylist {
  const { now, origin } = options;
  const owner = pick(random, accounts);
  const style = pick(random, STYLES);
  const isVote = chance(random, 0.6);
  const isPrivate = chance(random, 0.2);
  const license = chance(random, 0.25)
    ? PlaylistLicense.INVITED_ONLY
    : PlaylistLicense.EVERYONE;

  let period: Period = { beginAt: null, endAt: null };
  if (isVote || chance(random, 0.5)) {
    period = randomPeriod(random, now);
  }
  const hasBegun = period.beginAt === null || period.beginAt <= now;

  const nameTemplate = pick(random, isVote ? VOTE_NAMES : EDITOR_NAMES);
  const name = uniqueName(
    nameTemplate(style, firstNameOf(owner)),
    owner.id,
    playlistNames,
  );

  const others = accounts.filter((account) => account.id !== owner.id);
  const memberCount = Math.min(integerBetween(random, 2, 8), others.length);
  const members = pickSome(random, others, memberCount);
  // Joining needs a public playlist that has begun: the others were invited
  const canHaveJoined = !isPrivate && hasBegun;
  const participants: DemoParticipant[] = members.map((member) => ({
    accountId: member.id,
    joinedVia: joinMethod(random, canHaveJoined, license),
    hasPrivilege: chance(random, 0.15),
  }));

  const memberIds = new Set(members.map((member) => member.id));
  const nonMembers = others.filter((account) => !memberIds.has(account.id));
  const invitees = pickSome(random, nonMembers, integerBetween(random, 0, 2));
  const invitations: DemoInvitation[] = invitees.map((invitee) => ({
    inviterId: owner.id,
    inviteeId: invitee.id,
  }));

  // Before a VOTE party begins, only its owner prepares it
  const actorIds =
    isVote && !hasBegun
      ? [owner.id]
      : trackActorIds(owner.id, participants, license);
  const drafts = trackDrafts(random, isVote, hasBegun, actorIds);
  const firstAddition =
    period.beginAt !== null && period.beginAt <= now
      ? period.beginAt
      : before(now, drafts);

  return {
    infos: {
      id: randomUUID(),
      type: isVote ? PlaylistType.VOTE : PlaylistType.EDITOR,
      ownerId: owner.id,
      name,
      description: pick(random, DESCRIPTIONS),
      isPrivate,
      license,
      beginAt: period.beginAt,
      endAt: period.endAt,
      ...(isVote ? votePlace(random, origin) : {}),
      createdAt: new Date(now.getTime() - integerBetween(random, 1, 30) * DAY),
    },
    participants,
    invitations,
    tracks: tracks(drafts, firstAddition, now),
  };
}

function votePlace(
  random: Random,
  origin: Coordinates,
): Coordinates & { address: string } {
  const location = randomLocation(random, origin);
  const streetNumber = integerBetween(random, 1, 120);
  return {
    ...location,
    address: `${streetNumber} ${pick(random, STREETS)}, Paris`,
  };
}

function joinMethod(
  random: Random,
  canHaveJoined: boolean,
  license: PlaylistLicense,
): JoinMethod {
  if (!canHaveJoined) {
    return JoinMethod.INVITATION;
  }
  const invitationRate = license === PlaylistLicense.INVITED_ONLY ? 0.7 : 0.2;
  return chance(random, invitationRate)
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
  random: Random,
  isVote: boolean,
  hasBegun: boolean,
  actorIds: string[],
): TrackDraft[] {
  const musics = pickSome(random, ALL_MUSIC, integerBetween(random, 3, 12));
  // The first tracks of a running or past party were already played
  const playedCount = isVote && hasBegun ? Math.floor(musics.length * 0.2) : 0;

  return musics.map((music, index) => {
    const voterIds = isVote ? actorIds.filter(() => chance(random, 0.35)) : [];
    return {
      music,
      addedBy: pick(random, actorIds),
      voterIds,
      played: index < playedCount,
    };
  });
}

function crowdFriendships(
  random: Random,
  accounts: DemoAccountInfos[],
  friendKeys: Set<string>,
): DemoFriendship[] {
  const friendships: DemoFriendship[] = [];
  for (const account of accounts) {
    const others = accounts.filter((other) => other.id !== account.id);
    for (const friend of pickSome(random, others, FRIENDS_PER_ACCOUNT)) {
      const key = pairKey(account.id, friend.id);
      if (!friendKeys.has(key)) {
        friendKeys.add(key);
        friendships.push({ userA: account.id, userB: friend.id });
      }
    }
  }
  return friendships;
}

// Never between two friends, at most one per pair
function crowdFriendshipRequests(
  random: Random,
  accounts: DemoAccountInfos[],
  friendKeys: Set<string>,
): DemoFriendshipRequest[] {
  const requestCount = Math.floor(
    accounts.length / ACCOUNTS_PER_FRIENDSHIP_REQUEST,
  );
  const requestKeys = new Set<string>();
  const requests: DemoFriendshipRequest[] = [];
  for (let index = 0; index < requestCount; index++) {
    const [sender, receiver] = pickSome(random, accounts, 2);
    const key = pairKey(sender.id, receiver.id);
    if (!friendKeys.has(key) && !requestKeys.has(key)) {
      requestKeys.add(key);
      requests.push({ senderId: sender.id, receiverId: receiver.id });
    }
  }
  return requests;
}
