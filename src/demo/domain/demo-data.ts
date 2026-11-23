import { Coordinates } from 'src/playlist/domain/geo';
import { CreatePlaylistInfos } from 'src/playlist/domain/playlist.entity';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { MusicInfos } from 'src/playlist/domain/track.entity';

// The demo data as plain values: the seed builds the entities from them, so
// every domain rule still applies. Shared by the scenario and the crowd.

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

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
// Delay between two additions of tracks
const ADDITION_INTERVAL = 4 * MINUTE;
// One degree of latitude is ~111 195 meters
const METERS_PER_LATITUDE_DEGREE = 111_195;

export type TrackDraft = {
  music: MusicInfos;
  addedBy: string;
  voterIds?: string[];
  played?: boolean;
};

// The labels match the default origin (42 Paris): the coordinates follow the
// origin, the labels do not
export function offset(
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

export function participant(
  accountId: string,
  joinedVia: JoinMethod,
  hasPrivilege = false,
): DemoParticipant {
  return { accountId, joinedVia, hasPrivilege };
}

export function joined(...accountIds: string[]): DemoParticipant[] {
  return accountIds.map((accountId) => participant(accountId, JoinMethod.JOIN));
}

// Tracks are added one after the other, from the beginning of the playlist
// (or before now for a playlist that has not begun), never in the future
export function tracks(
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

export function before(now: Date, drafts: TrackDraft[]): Date {
  return new Date(now.getTime() - drafts.length * ADDITION_INTERVAL);
}
