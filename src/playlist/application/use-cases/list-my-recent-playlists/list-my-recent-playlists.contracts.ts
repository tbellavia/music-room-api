import { ListedPlaylist } from 'src/playlist/application/listed-playlist';

export type ListMyRecentPlaylistsInput = {
  accountId: string;
};

export type ListMyRecentPlaylistsOutput = {
  playlists: ListedPlaylist[];
};
