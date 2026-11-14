import { Playlist } from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import { PlaylistRole } from 'src/playlist/domain/playlist-role.enum';
import { PlaylistStatus } from 'src/playlist/domain/playlist-status.enum';

// A playlist seen by one of its members, shared by the "my playlists" listings
export type MyPlaylist = {
  id: string;
  type: PlaylistType;
  license: PlaylistLicense;
  ownerId: string;
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

export function toMyPlaylist(
  playlist: Playlist,
  membership: Membership,
  now: Date,
): MyPlaylist {
  return {
    id: playlist.id,
    type: playlist.type,
    license: playlist.license,
    ownerId: playlist.ownerId,
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
