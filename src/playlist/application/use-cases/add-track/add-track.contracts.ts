import { Coordinates } from 'src/playlist/domain/geo';

export type AddTrackInput = {
  playlistId: string;
  accountId: string;
  videoId: string;
  // Required for participants, who must be on site
  position: Coordinates | null;
};

export type AddTrackOutput = {
  trackId: string;
};
