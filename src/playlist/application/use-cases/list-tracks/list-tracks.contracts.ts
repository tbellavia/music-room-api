import { TrackView } from '../../track-view';

export type ListTracksInput = {
  playlistId: string;
  accountId: string;
};

export type RankedTrackView = TrackView & {
  hasVoted: boolean;
};

export type ListTracksOutput = {
  tracks: RankedTrackView[];
};
