import { Coordinates } from 'src/playlist/domain/geo';
import { ListedPlaylist } from 'src/playlist/application/listed-playlist';

export type ListPublicPlaylistsInput = {
  accountId: string;
  // Gives distanceMeters and canJoinHere for VOTE playlists
  position: Coordinates | null;
};

export type ListPublicPlaylistsOutput = {
  playlists: ListedPlaylist[];
};
