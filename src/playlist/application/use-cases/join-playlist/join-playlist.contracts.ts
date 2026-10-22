export type JoinPlaylistInput = {
  playlistId: string;
  accountId: string;
  latitude: number;
  longitude: number;
};

export type JoinPlaylistOutput = {
  participantId: string;
};
