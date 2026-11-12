import { Coordinates } from 'src/playlist/domain/geo';

export type JoinPlaylistInput = {
  playlistId: string;
  accountId: string;
  // Only used for a VOTE playlist: null when the app did not send it
  position: Coordinates | null;
};

export type JoinPlaylistOutput = {
  participantId: string;
};
