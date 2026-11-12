import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';

export type PublicPlaylist = {
  id: string;
  type: PlaylistType;
  license: PlaylistLicense;
  ownerId: string;
  name: string;
  description: string;
  beginAt: Date | null;
  endAt: Date | null;
  // null for an EDITOR playlist
  latitude: number | null;
  longitude: number | null;
  coverPath: string | null;
};

export type ListPublicPlaylistsOutput = {
  playlists: PublicPlaylist[];
};
