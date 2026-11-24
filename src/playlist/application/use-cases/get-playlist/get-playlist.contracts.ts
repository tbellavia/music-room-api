import { Coordinates } from 'src/playlist/domain/geo';
import { ListedPlaylist } from 'src/playlist/application/listed-playlist';

export type GetPlaylistInput = {
  playlistId: string;
  accountId: string;
  // Gives distanceMeters and canJoinHere for a VOTE playlist
  position: Coordinates | null;
};

export type GetPlaylistOutput = ListedPlaylist;
