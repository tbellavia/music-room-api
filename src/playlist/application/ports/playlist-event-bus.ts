import { Observable } from 'rxjs';
import { TrackView } from '../track-view';

// Events pushed to the clients watching a playlist (Server-Sent Events)

export type TrackAddedEvent = {
  type: 'track.added';
  playlistId: string;
  track: TrackView;
};

export type TrackVotesChangedEvent = {
  type: 'track.votes_changed';
  playlistId: string;
  trackId: string;
  votes: number;
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
  | TrackPlayedEvent
  | TrackRemovedEvent;

export interface PlaylistEventBus {
  publish(event: PlaylistEvent): void;
  streamFor(playlistId: string): Observable<PlaylistEvent>;
}

export const PLAYLIST_EVENT_BUS = Symbol('PlaylistEventBus');
