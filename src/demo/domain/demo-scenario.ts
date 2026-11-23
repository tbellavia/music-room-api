import { randomUUID } from 'crypto';
import { Coordinates } from 'src/playlist/domain/geo';
import { CreatePlaylistInfos } from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { MusicInfos } from 'src/playlist/domain/track.entity';
import { DEV1_ACCOUNT, DEV2_ACCOUNT } from 'src/identity/domain/dev-accounts';
import { DEMO_MUSIC } from './demo-music-library';
import {
  CHLOE,
  EMMA,
  HUGO,
  INES,
  KARIM,
  LEA,
  LUCAS,
  MAYA,
  NATHAN,
  SOFIA,
  TOM,
  YANIS,
} from './demo-accounts';

// The demo data as plain values: the seed builds the entities from them, so
// every domain rule still applies. Each playlist shows one rule of the subject.

export type DemoFriendship = {
  userA: string;
  userB: string;
};

export type DemoFriendshipRequest = {
  senderId: string;
  receiverId: string;
};

export type DemoParticipant = {
  accountId: string;
  joinedVia: JoinMethod;
  hasPrivilege: boolean;
};

export type DemoInvitation = {
  inviterId: string;
  inviteeId: string;
};

export type DemoTrack = {
  music: MusicInfos;
  addedBy: string;
  addedAt: Date;
  // Played tracks stay in the history of a VOTE playlist
  playedAt: Date | null;
  voterIds: string[];
};

export type DemoPlaylist = {
  infos: CreatePlaylistInfos;
  participants: DemoParticipant[];
  invitations: DemoInvitation[];
  // In the order of an EDITOR playlist
  tracks: DemoTrack[];
};

export type DemoScenario = {
  friendships: DemoFriendship[];
  friendshipRequests: DemoFriendshipRequest[];
  playlists: DemoPlaylist[];
};

export type DemoScenarioOptions = {
  // Dates are relative to it: a "live" party is live when the seed runs
  now: Date;
  // Where the VOTE parties take place (42 Paris by default)
  origin: Coordinates;
  // In dev mode, dev1 and dev2 get some content of their own
  withDevAccounts: boolean;
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
// Delay between two additions of tracks
const ADDITION_INTERVAL = 4 * MINUTE;
// One degree of latitude is ~111 195 meters
const METERS_PER_LATITUDE_DEGREE = 111_195;

type TrackDraft = {
  music: MusicInfos;
  addedBy: string;
  voterIds?: string[];
  played?: boolean;
};

// The labels match the default origin (42 Paris): the coordinates follow the
// origin, the labels do not
function offset(
  origin: Coordinates,
  northMeters: number,
  eastMeters: number,
): Coordinates {
  const latitudeRadians = (origin.latitude * Math.PI) / 180;
  const metersPerLongitudeDegree =
    METERS_PER_LATITUDE_DEGREE * Math.cos(latitudeRadians);
  return {
    latitude: origin.latitude + northMeters / METERS_PER_LATITUDE_DEGREE,
    longitude: origin.longitude + eastMeters / metersPerLongitudeDegree,
  };
}

function participant(
  accountId: string,
  joinedVia: JoinMethod,
  hasPrivilege = false,
): DemoParticipant {
  return { accountId, joinedVia, hasPrivilege };
}

function joined(...accountIds: string[]): DemoParticipant[] {
  return accountIds.map((accountId) => participant(accountId, JoinMethod.JOIN));
}

// Tracks are added one after the other, from the beginning of the playlist
// (or before now for a playlist that has not begun), never in the future
function tracks(
  drafts: TrackDraft[],
  firstAddition: Date,
  now: Date,
): DemoTrack[] {
  return drafts.map((draft, index) => {
    const addedAt = new Date(
      Math.min(
        firstAddition.getTime() + index * ADDITION_INTERVAL,
        now.getTime(),
      ),
    );
    return {
      music: draft.music,
      addedBy: draft.addedBy,
      addedAt,
      playedAt: draft.played === true ? addedAt : null,
      voterIds: draft.voterIds ?? [],
    };
  });
}

function before(now: Date, drafts: TrackDraft[]): Date {
  return new Date(now.getTime() - drafts.length * ADDITION_INTERVAL);
}

function devAccountIds(withDevAccounts: boolean, ...ids: string[]): string[] {
  return withDevAccounts ? ids : [];
}

export function buildDemoScenario(options: DemoScenarioOptions): DemoScenario {
  return {
    friendships: friendships(options),
    friendshipRequests: friendshipRequests(options),
    playlists: [
      liveParty(options),
      farAfterwork(options),
      tomorrowFestival(options),
      endedRooftop(options),
      upcomingChill(options),
      campusRadio(options),
      invitedOnlyProject(options),
      privateBirthday(options),
    ],
  };
}

function friendships(options: DemoScenarioOptions): DemoFriendship[] {
  const pairs: [string, string][] = [
    [LEA.id, KARIM.id],
    [LEA.id, SOFIA.id],
    [LEA.id, TOM.id],
    [LEA.id, HUGO.id],
    [KARIM.id, SOFIA.id],
    [KARIM.id, NATHAN.id],
    [SOFIA.id, HUGO.id],
    [SOFIA.id, CHLOE.id],
    [INES.id, MAYA.id],
    [TOM.id, YANIS.id],
    [EMMA.id, LUCAS.id],
  ];
  if (options.withDevAccounts) {
    pairs.push([DEV1_ACCOUNT.id, LEA.id]);
  }
  return pairs.map(([userA, userB]) => ({ userA, userB }));
}

function friendshipRequests(
  options: DemoScenarioOptions,
): DemoFriendshipRequest[] {
  const requests: [string, string][] = [
    [NATHAN.id, LEA.id],
    [EMMA.id, LEA.id],
    [YANIS.id, CHLOE.id],
  ];
  if (options.withDevAccounts) {
    requests.push([KARIM.id, DEV1_ACCOUNT.id]);
    requests.push([LUCAS.id, DEV2_ACCOUNT.id]);
  }
  return requests.map(([senderId, receiverId]) => ({ senderId, receiverId }));
}

// Live, on site: votes in real time, the ranking, canJoinHere from 42
function liveParty(options: DemoScenarioOptions): DemoPlaylist {
  const { now, origin } = options;
  const beginAt = new Date(now.getTime() - HOUR);
  const levitatingVoters = [
    MAYA.id,
    ...devAccountIds(options.withDevAccounts, DEV1_ACCOUNT.id),
  ];
  const drafts: TrackDraft[] = [
    {
      music: DEMO_MUSIC.BILLIE_JEAN,
      addedBy: LEA.id,
      voterIds: [KARIM.id, SOFIA.id, HUGO.id],
      played: true,
    },
    {
      music: DEMO_MUSIC.I_WANNA_DANCE_WITH_SOMEBODY,
      addedBy: MAYA.id,
      voterIds: [LEA.id],
      played: true,
    },
    {
      music: DEMO_MUSIC.ONE_MORE_TIME,
      addedBy: LEA.id,
      voterIds: [LEA.id, KARIM.id, SOFIA.id, TOM.id, MAYA.id],
    },
    {
      music: DEMO_MUSIC.BLINDING_LIGHTS,
      addedBy: MAYA.id,
      voterIds: [MAYA.id, SOFIA.id, YANIS.id, HUGO.id],
    },
    {
      music: DEMO_MUSIC.GET_LUCKY,
      addedBy: TOM.id,
      voterIds: [LEA.id, TOM.id, KARIM.id],
    },
    // Same score as Get Lucky, added later: ranked after it
    {
      music: DEMO_MUSIC.DONT_STOP_ME_NOW,
      addedBy: HUGO.id,
      voterIds: [HUGO.id, MAYA.id, KARIM.id],
    },
    {
      music: DEMO_MUSIC.DJADJA,
      addedBy: YANIS.id,
      voterIds: [YANIS.id, SOFIA.id],
    },
    {
      music: DEMO_MUSIC.LEVITATING,
      addedBy: SOFIA.id,
      voterIds: levitatingVoters,
    },
    {
      music: DEMO_MUSIC.ALORS_ON_DANSE,
      addedBy: KARIM.id,
      voterIds: [KARIM.id],
    },
    { music: DEMO_MUSIC.TITANIUM, addedBy: LEA.id },
    { music: DEMO_MUSIC.HEY_YA, addedBy: TOM.id },
  ];
  const participants = joined(KARIM.id, HUGO.id, TOM.id, MAYA.id, YANIS.id);
  participants.push(participant(SOFIA.id, JoinMethod.JOIN, true));
  if (options.withDevAccounts) {
    participants.push(participant(DEV1_ACCOUNT.id, JoinMethod.JOIN));
  }

  return {
    infos: {
      id: randomUUID(),
      type: PlaylistType.VOTE,
      ownerId: LEA.id,
      name: 'Soirée BDE 42',
      description: 'La soirée de rentrée du BDE : votez pour le prochain son !',
      beginAt,
      endAt: new Date(now.getTime() + 5 * HOUR),
      ...origin,
      address: '96 boulevard Bessières, 75017 Paris',
      createdAt: new Date(now.getTime() - 2 * DAY),
    },
    participants,
    invitations: [],
    tracks: tracks(drafts, beginAt, now),
  };
}

// Live but ~6 km away: listed by /events, too far to join from 42
function farAfterwork(options: DemoScenarioOptions): DemoPlaylist {
  const { now, origin } = options;
  const beginAt = new Date(now.getTime() - 30 * MINUTE);
  const drafts: TrackDraft[] = [
    {
      music: DEMO_MUSIC.DO_I_WANNA_KNOW,
      addedBy: KARIM.id,
      voterIds: [NATHAN.id, EMMA.id],
    },
    {
      music: DEMO_MUSIC.LAST_NITE,
      addedBy: NATHAN.id,
      voterIds: [NATHAN.id, LUCAS.id, KARIM.id],
    },
    { music: DEMO_MUSIC.LISZTOMANIA, addedBy: EMMA.id },
    { music: DEMO_MUSIC.FEEL_GOOD_INC, addedBy: LUCAS.id, voterIds: [EMMA.id] },
    {
      music: DEMO_MUSIC.THE_LESS_I_KNOW_THE_BETTER,
      addedBy: KARIM.id,
      voterIds: [LUCAS.id],
    },
  ];

  return {
    infos: {
      id: randomUUID(),
      type: PlaylistType.VOTE,
      ownerId: KARIM.id,
      name: 'Afterwork Bastille',
      description: 'Indie rock en terrasse après le boulot',
      beginAt,
      endAt: new Date(now.getTime() + 3 * HOUR),
      ...offset(origin, -4800, 4000),
      address: 'Place de la Bastille, 75011 Paris',
      createdAt: new Date(now.getTime() - DAY),
    },
    participants: joined(NATHAN.id, EMMA.id, LUCAS.id),
    invitations: [],
    tracks: tracks(drafts, beginAt, now),
  };
}

// Tomorrow: the owner prepares the playlist, invitations accepted in advance
function tomorrowFestival(options: DemoScenarioOptions): DemoPlaylist {
  const { now, origin } = options;
  const drafts: TrackDraft[] = [
    { music: DEMO_MUSIC.VIVA_LA_VIDA, addedBy: SOFIA.id, voterIds: [SOFIA.id] },
    { music: DEMO_MUSIC.AS_IT_WAS, addedBy: SOFIA.id },
    { music: DEMO_MUSIC.BAD_GUY, addedBy: SOFIA.id },
    { music: DEMO_MUSIC.LEVELS, addedBy: SOFIA.id },
    { music: DEMO_MUSIC.CREEP, addedBy: SOFIA.id },
  ];
  const invitations: DemoInvitation[] = [
    { inviterId: SOFIA.id, inviteeId: INES.id },
  ];
  if (options.withDevAccounts) {
    invitations.push({ inviterId: SOFIA.id, inviteeId: DEV2_ACCOUNT.id });
  }

  return {
    infos: {
      id: randomUUID(),
      type: PlaylistType.VOTE,
      ownerId: SOFIA.id,
      name: 'Festival de demain',
      description:
        "Le festival du parc, la playlist se prépare dès aujourd'hui",
      beginAt: new Date(now.getTime() + DAY),
      endAt: new Date(now.getTime() + DAY + 6 * HOUR),
      ...offset(origin, -1000, 300),
      address: 'Parc Clichy-Batignolles, 75017 Paris',
      createdAt: new Date(now.getTime() - 3 * DAY),
    },
    participants: [participant(HUGO.id, JoinMethod.INVITATION)],
    invitations,
    tracks: tracks(drafts, before(now, drafts), now),
  };
}

// Ended yesterday: absent from /public and /events, still in /me
function endedRooftop(options: DemoScenarioOptions): DemoPlaylist {
  const { now, origin } = options;
  const beginAt = new Date(now.getTime() - 26 * HOUR);
  const drafts: TrackDraft[] = [
    {
      music: DEMO_MUSIC.SMELLS_LIKE_TEEN_SPIRIT,
      addedBy: HUGO.id,
      voterIds: [LEA.id, TOM.id],
      played: true,
    },
    { music: DEMO_MUSIC.ENTER_SANDMAN, addedBy: HUGO.id, played: true },
    {
      music: DEMO_MUSIC.HIGHWAY_TO_HELL,
      addedBy: TOM.id,
      voterIds: [CHLOE.id],
    },
    {
      music: DEMO_MUSIC.CALIFORNICATION,
      addedBy: CHLOE.id,
      voterIds: [HUGO.id, LEA.id],
    },
  ];

  return {
    infos: {
      id: randomUUID(),
      type: PlaylistType.VOTE,
      ownerId: HUGO.id,
      name: "Rooftop d'hier",
      description: 'Soirée rock sur le toit, merci à tous !',
      beginAt,
      endAt: new Date(now.getTime() - 20 * HOUR),
      ...offset(origin, 200, 600),
      address: 'Avenue de Clichy, 75017 Paris',
      createdAt: new Date(now.getTime() - 4 * DAY),
    },
    participants: joined(LEA.id, TOM.id, CHLOE.id),
    invitations: [],
    tracks: tracks(drafts, beginAt, now),
  };
}

// In 3 days, 300 m away: close, but cannot be joined before it begins
function upcomingChill(options: DemoScenarioOptions): DemoPlaylist {
  const { now, origin } = options;
  const drafts: TrackDraft[] = [
    { music: DEMO_MUSIC.TAKE_FIVE, addedBy: INES.id },
    { music: DEMO_MUSIC.SO_WHAT, addedBy: INES.id },
    { music: DEMO_MUSIC.DONT_KNOW_WHY, addedBy: INES.id },
    { music: DEMO_MUSIC.FEELING_GOOD, addedBy: INES.id },
  ];

  return {
    infos: {
      id: randomUUID(),
      type: PlaylistType.VOTE,
      ownerId: INES.id,
      name: 'Jazz du dimanche',
      description: 'Jazz tranquille pour finir le week-end',
      beginAt: new Date(now.getTime() + 3 * DAY),
      endAt: new Date(now.getTime() + 3 * DAY + 4 * HOUR),
      ...offset(origin, 300, 0),
      address: 'Square des Épinettes, 75017 Paris',
      createdAt: new Date(now.getTime() - 5 * HOUR),
    },
    participants: [],
    invitations: [],
    tracks: tracks(drafts, before(now, drafts), now),
  };
}

// Remote collaboration, no dates: always live, anyone can join and edit
function campusRadio(options: DemoScenarioOptions): DemoPlaylist {
  const { now } = options;
  const drafts: TrackDraft[] = [
    { music: DEMO_MUSIC.DANCE, addedBy: TOM.id },
    { music: DEMO_MUSIC.MAREA, addedBy: LUCAS.id },
    { music: DEMO_MUSIC.LATCH, addedBy: MAYA.id },
    { music: DEMO_MUSIC.FEEL_SO_CLOSE, addedBy: TOM.id },
    { music: DEMO_MUSIC.LA_FEMME_D_ARGENT, addedBy: LEA.id },
    { music: DEMO_MUSIC.HUMBLE, addedBy: YANIS.id },
    { music: DEMO_MUSIC.STILL_DRE, addedBy: YANIS.id },
    { music: DEMO_MUSIC.BASIQUE, addedBy: KARIM.id },
    { music: DEMO_MUSIC.PAPAOUTAI, addedBy: MAYA.id },
    { music: DEMO_MUSIC.JUSQU_AU_DERNIER_GRAMME, addedBy: YANIS.id },
  ];
  const participants = joined(LEA.id, KARIM.id, MAYA.id, YANIS.id, LUCAS.id);
  if (options.withDevAccounts) {
    participants.push(participant(DEV1_ACCOUNT.id, JoinMethod.JOIN));
  }

  return {
    infos: {
      id: randomUUID(),
      type: PlaylistType.EDITOR,
      ownerId: TOM.id,
      name: 'Radio du campus',
      description: 'La playlist commune du campus, ajoutez et réordonnez',
      createdAt: new Date(now.getTime() - 10 * DAY),
    },
    participants,
    invitations: [],
    tracks: tracks(drafts, before(now, drafts), now),
  };
}

// INVITED_ONLY: Yanis joined by himself, he can read but not edit
function invitedOnlyProject(options: DemoScenarioOptions): DemoPlaylist {
  const { now } = options;
  const drafts: TrackDraft[] = [
    { music: DEMO_MUSIC.DREAMS, addedBy: INES.id },
    { music: DEMO_MUSIC.SKINNY_LOVE, addedBy: EMMA.id },
    { music: DEMO_MUSIC.LITTLE_LION_MAN, addedBy: EMMA.id },
    { music: DEMO_MUSIC.THE_SOUND_OF_SILENCE, addedBy: MAYA.id },
  ];

  return {
    infos: {
      id: randomUUID(),
      type: PlaylistType.EDITOR,
      ownerId: INES.id,
      name: 'Projet de groupe',
      description: 'Folk acoustique pour notre court-métrage',
      license: PlaylistLicense.INVITED_ONLY,
      createdAt: new Date(now.getTime() - 6 * DAY),
    },
    participants: [
      participant(MAYA.id, JoinMethod.INVITATION, true),
      participant(EMMA.id, JoinMethod.INVITATION),
      participant(YANIS.id, JoinMethod.JOIN),
    ],
    invitations: [],
    tracks: tracks(drafts, before(now, drafts), now),
  };
}

// Private: invisible to Léa, the one it is a surprise for
function privateBirthday(options: DemoScenarioOptions): DemoPlaylist {
  const { now } = options;
  const drafts: TrackDraft[] = [
    { music: DEMO_MUSIC.CRAZY_IN_LOVE, addedBy: CHLOE.id },
    { music: DEMO_MUSIC.BACK_TO_BLACK, addedBy: CHLOE.id },
    { music: DEMO_MUSIC.RESPECT, addedBy: SOFIA.id },
    { music: DEMO_MUSIC.SUPERSTITION, addedBy: KARIM.id },
    { music: DEMO_MUSIC.AINT_NO_MOUNTAIN_HIGH_ENOUGH, addedBy: SOFIA.id },
    { music: DEMO_MUSIC.UMBRELLA, addedBy: KARIM.id },
  ];
  const invitations: DemoInvitation[] = [
    { inviterId: CHLOE.id, inviteeId: HUGO.id },
    // Sofia has the privilege: she can invite too
    { inviterId: SOFIA.id, inviteeId: TOM.id },
  ];
  if (options.withDevAccounts) {
    invitations.push({ inviterId: CHLOE.id, inviteeId: DEV1_ACCOUNT.id });
  }

  return {
    infos: {
      id: randomUUID(),
      type: PlaylistType.EDITOR,
      ownerId: CHLOE.id,
      name: 'Anniversaire surprise de Léa',
      description: 'Chut, Léa ne doit rien savoir !',
      isPrivate: true,
      createdAt: new Date(now.getTime() - 2 * DAY),
    },
    participants: [
      participant(KARIM.id, JoinMethod.INVITATION),
      participant(SOFIA.id, JoinMethod.INVITATION, true),
    ],
    invitations,
    tracks: tracks(drafts, before(now, drafts), now),
  };
}
