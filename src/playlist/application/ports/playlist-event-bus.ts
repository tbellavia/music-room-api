import { Observable } from 'rxjs';
import { EditorTrackView, VoteTrackView } from '../track-view';

// Events pushed to the clients watching a playlist (Server-Sent Events)

export type TrackAddedEvent = {
  type: 'track.added';
  playlistId: string;
  track: VoteTrackView | EditorTrackView;
  // EDITOR: the track it was placed after (null when first); VOTE: always null
  afterTrackId: string | null;
};

export type TrackVotesChangedEvent = {
  type: 'track.votes_changed';
  playlistId: string;
  trackId: string;
  votes: number;
};

export type TrackMovedEvent = {
  type: 'track.moved';
  playlistId: string;
  trackId: string;
  // null: moved to the top of the playlist
  afterTrackId: string | null;
  version: number;
};

export type TrackPlayedEvent = {
  type: 'track.played';
  playlistId: string;
  trackId: string;
};

export type TrackRemovedEvent = {
  type: 'track.removed';
  playlistId: string;
  trackId: string;
};

export type PlaylistEvent =
  | TrackAddedEvent
  | TrackVotesChangedEvent
  | TrackMovedEvent
  | TrackPlayedEvent
  | TrackRemovedEvent;

export interface PlaylistEventBus {
  publish(event: PlaylistEvent): void;
  streamFor(playlistId: string): Observable<PlaylistEvent>;
}

export const PLAYLIST_EVENT_BUS = Symbol('PlaylistEventBus');
