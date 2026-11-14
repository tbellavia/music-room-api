import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';

export type PublicPlaylist = {
  id: string;
  type: PlaylistType;
  license: PlaylistLicense;
  ownerId: string;
  ownerUsername: string | null;
  name: string;
  description: string;
  beginAt: Date | null;
  endAt: Date | null;
  // null for an EDITOR playlist
  latitude: number | null;
  longitude: number | null;
  // Label only, null for an EDITOR playlist
  address: string | null;
  coverPath: string | null;
};

export type ListPublicPlaylistsOutput = {
  playlists: PublicPlaylist[];
};
