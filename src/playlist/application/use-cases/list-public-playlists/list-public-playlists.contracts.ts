import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';

export type PublicPlaylist = {
  id: string;
  type: PlaylistType;
  ownerId: string;
  name: string;
  description: string;
  beginAt: Date | null;
  endAt: Date | null;
  latitude: number;
  longitude: number;
  coverPath: string | null;
};

export type ListPublicPlaylistsOutput = {
  playlists: PublicPlaylist[];
};
