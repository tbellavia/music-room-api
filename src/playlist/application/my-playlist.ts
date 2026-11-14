import { Playlist } from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import { PlaylistRole } from 'src/playlist/domain/playlist-role.enum';
import { PlaylistStatus } from 'src/playlist/domain/playlist-status.enum';
import { AccountDirectory } from './ports/account-directory';

// A playlist seen by one of its members, shared by the "my playlists" listings
export type MyPlaylist = {
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
  role: PlaylistRole;
  // Always true for the owner, who has every right
  hasPrivilege: boolean;
};

export type Membership = {
  role: PlaylistRole;
  hasPrivilege: boolean;
};

export const OWNER_MEMBERSHIP: Membership = {
  role: PlaylistRole.OWNER,
  hasPrivilege: true,
};

// A playlist of the caller, with the caller's role in it
export type MemberPlaylist = {
  playlist: Playlist;
  membership: Membership;
};

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

export function toMyPlaylist(
  memberPlaylist: MemberPlaylist,
  usernameById: Map<string, string>,
  now: Date,
): MyPlaylist {
  const playlist = memberPlaylist.playlist;
  const membership = memberPlaylist.membership;

  return {
    id: playlist.id,
    type: playlist.type,
    license: playlist.license,
    ownerId: playlist.ownerId,
    ownerUsername: usernameById.get(playlist.ownerId) ?? null,
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
    status: playlist.status(now),
    role: membership.role,
    hasPrivilege: membership.hasPrivilege,
  };
}
