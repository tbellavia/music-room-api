import { TrackVote } from 'src/playlist/domain/track-vote.entity';

export interface VoteRepository {
  findByTrackAndAccount(infos: {
    trackId: string;
    accountId: string;
  }): Promise<TrackVote | null>;
  findByTracks(trackIds: string[]): Promise<TrackVote[]>;
  countByTrack(trackId: string): Promise<number>;
  // Must fail with AlreadyVoted if the account already voted for the track
  add(vote: TrackVote): Promise<void>;
  delete(infos: { trackId: string; accountId: string }): Promise<void>;
  deleteByTrack(trackId: string): Promise<void>;
}

export const VOTE_REPOSITORY = Symbol('VoteRepository');
