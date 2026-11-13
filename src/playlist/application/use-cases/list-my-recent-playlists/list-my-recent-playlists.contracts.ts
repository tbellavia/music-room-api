import { MyPlaylist } from 'src/playlist/application/my-playlist';

export type ListMyRecentPlaylistsInput = {
  accountId: string;
};

export type ListMyRecentPlaylistsOutput = {
  playlists: MyPlaylist[];
};
