import { Playlist } from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import { PlaylistRole } from 'src/playlist/domain/playlist-role.enum';
import { PlaylistStatus } from 'src/playlist/domain/playlist-status.enum';
import { Participant } from 'src/playlist/domain/participant.entity';
import { Coordinates } from 'src/playlist/domain/geo';
import { AccountDirectory } from './ports/account-directory';
import { ParticipantRepository } from './ports/participant.repository';

// The same format for every playlist listing (public, mine, events), so that
// the app decodes a single model. The last fields depend on the caller.
export type ListedPlaylist = {
  id: string;
  type: PlaylistType;
  license: PlaylistLicense;
  ownerId: string;
  // null if the account cannot be found
  ownerUsername: string | null;
  name: string;
  description: string;
  isPrivate: boolean;
  beginAt: Date | null;
  endAt: Date | null;
  // null for an EDITOR playlist
  latitude: number | null;
  longitude: number | null;
  // Label only, null for an EDITOR playlist
  address: string | null;
  coverPath: string | null;
  createdAt: Date;
  status: PlaylistStatus;
  // null when the caller is not a member
  role: PlaylistRole | null;
  // Always true for the owner, who has every right
  hasPrivilege: boolean;
  // Rounded to the meter, null without position or for an EDITOR playlist
  distanceMeters: number | null;
  canJoinHere: boolean;
};

export type Membership = {
  role: PlaylistRole;
  hasPrivilege: boolean;
};

export const OWNER_MEMBERSHIP: Membership = {
  role: PlaylistRole.OWNER,
  hasPrivilege: true,
};

// A playlist and the caller's place in it, null when the caller is not a member
export type PlaylistWithMembership = {
  playlist: Playlist;
  membership: Membership | null;
};

// What the caller-dependent fields are computed from
export type ListingContext = {
  usernameById: Map<string, string>;
  position: Coordinates | null;
  now: Date;
};

export function participantMembership(participant: Participant): Membership {
  return {
    role: PlaylistRole.PARTICIPANT,
    hasPrivilege: participant.hasPrivilege,
  };
}

// One lookup for the whole list
export async function findOwnerUsernames(
  accountDirectory: AccountDirectory,
  playlists: Playlist[],
): Promise<Map<string, string>> {
  const ownerIds = playlists.map((playlist) => playlist.ownerId);
  const owners = await accountDirectory.findByIds(ownerIds);
  const usernameById = new Map<string, string>();
  for (const owner of owners) {
    usernameById.set(owner.id, owner.username);
  }
  return usernameById;
}

// One lookup for every playlist the account has joined
export async function findParticipationsByPlaylist(
  participantRepository: ParticipantRepository,
  accountId: string,
): Promise<Map<string, Participant>> {
  const participations = await participantRepository.findByAccount(accountId);
  const participationByPlaylistId = new Map<string, Participant>();
  for (const participation of participations) {
    participationByPlaylistId.set(participation.playlistId, participation);
  }
  return participationByPlaylistId;
}

export function membershipOf(
  playlist: Playlist,
  accountId: string,
  participationByPlaylistId: Map<string, Participant>,
): Membership | null {
  if (playlist.isOwner(accountId)) {
    return OWNER_MEMBERSHIP;
  }
  const participation = participationByPlaylistId.get(playlist.id);
  if (participation === undefined) {
    return null;
  }
  return participantMembership(participation);
}

export function toListedPlaylist(
  playlistWithMembership: PlaylistWithMembership,
  context: ListingContext,
): ListedPlaylist {
  const playlist = playlistWithMembership.playlist;
  const membership = playlistWithMembership.membership;

  return {
    id: playlist.id,
    type: playlist.type,
    license: playlist.license,
    ownerId: playlist.ownerId,
    ownerUsername: context.usernameById.get(playlist.ownerId) ?? null,
    name: playlist.name,
    description: playlist.description,
    isPrivate: playlist.isPrivate,
    beginAt: playlist.beginAt,
    endAt: playlist.endAt,
    latitude: playlist.latitude,
    longitude: playlist.longitude,
    address: playlist.address,
    coverPath: playlist.coverPath,
    createdAt: playlist.createdAt,
    status: playlist.status(context.now),
    role: membership === null ? null : membership.role,
    hasPrivilege: membership === null ? false : membership.hasPrivilege,
    distanceMeters: roundedDistance(playlist, context.position),
    // A member cannot join again
    canJoinHere:
      membership === null &&
      playlist.canBeJoinedFrom(context.position, context.now),
  };
}

function roundedDistance(
  playlist: Playlist,
  position: Coordinates | null,
): number | null {
  if (position === null) {
    return null;
  }
  const distanceMeters = playlist.distanceFrom(position);
  if (distanceMeters === null) {
    return null;
  }
  return Math.round(distanceMeters);
}
