import { Coordinates } from 'src/playlist/domain/geo';

export type WithdrawVoteInput = {
  playlistId: string;
  trackId: string;
  accountId: string;
  // Required for participants, who must be on site
  position: Coordinates | null;
};

export type WithdrawVoteOutput = {
  votes: number;
};
