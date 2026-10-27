import { Coordinates } from 'src/playlist/domain/geo';

export type DeleteTrackInput = {
  playlistId: string;
  trackId: string;
  accountId: string;
  // Required for participants of a VOTE playlist, who must be on site
  position: Coordinates | null;
};
