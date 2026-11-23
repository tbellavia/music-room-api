import { Coordinates } from 'src/playlist/domain/geo';

export type AddTrackInput = {
  playlistId: string;
  accountId: string;
  videoId: string;
  // Required for participants of a VOTE playlist, who must be on site
  position: Coordinates | null;
};

export type AddTrackOutput = {
  trackId: string;
  addedBy: string;
  addedAt: Date;
  // To send back when moving the track; null for a VOTE track, which never moves
  version: number | null;
};
