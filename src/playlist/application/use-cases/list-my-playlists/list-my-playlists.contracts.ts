import { MyPlaylist } from 'src/playlist/application/my-playlist';
import { PlaylistRole } from 'src/playlist/domain/playlist-role.enum';
import { PlaylistStatus } from 'src/playlist/domain/playlist-status.enum';

// Order of the creation dates
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export type ListMyPlaylistsInput = {
  accountId: string;
  // Filters, every playlist when omitted
  role?: PlaylistRole;
  status?: PlaylistStatus;
  // Defaults to DESC: the most recent first
  order?: SortOrder;
};

export type ListMyPlaylistsOutput = {
  playlists: MyPlaylist[];
};
