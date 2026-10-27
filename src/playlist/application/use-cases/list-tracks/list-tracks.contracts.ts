import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { EditorTrackView, VoteTrackView } from '../../track-view';

export type ListTracksInput = {
  playlistId: string;
  accountId: string;
};

export type RankedTrackView = VoteTrackView & {
  hasVoted: boolean;
};

// VOTE: ranking by votes
export type VoteTracksOutput = {
  type: PlaylistType.VOTE;
  tracks: RankedTrackView[];
};

// EDITOR: playlist order
export type EditorTracksOutput = {
  type: PlaylistType.EDITOR;
  tracks: EditorTrackView[];
};

export type ListTracksOutput = VoteTracksOutput | EditorTracksOutput;
