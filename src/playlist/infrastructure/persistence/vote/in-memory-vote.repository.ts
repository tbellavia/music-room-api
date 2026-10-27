import { VoteRepository } from 'src/playlist/application/ports/vote.repository';
import { TrackVote } from 'src/playlist/domain/track-vote.entity';
import { AlreadyVoted } from 'src/playlist/domain/errors/already-voted.error';

// Test double for use-case specs: no database involved
export class InMemoryVoteRepository implements VoteRepository {
  public readonly votes: TrackVote[] = [];

  findByTrackAndAccount(infos: {
    trackId: string;
    accountId: string;
  }): Promise<TrackVote | null> {
    const vote = this.votes.find(
      (candidate) =>
        candidate.trackId === infos.trackId &&
        candidate.accountId === infos.accountId,
    );
    return Promise.resolve(vote ?? null);
  }

  findByTracks(trackIds: string[]): Promise<TrackVote[]> {
    const trackVotes = this.votes.filter((vote) =>
      trackIds.includes(vote.trackId),
    );
    return Promise.resolve(trackVotes);
  }

  countByTrack(trackId: string): Promise<number> {
    const trackVotes = this.votes.filter((vote) => vote.trackId === trackId);
    return Promise.resolve(trackVotes.length);
  }

  async add(vote: TrackVote): Promise<void> {
    const existingVote = await this.findByTrackAndAccount({
      trackId: vote.trackId,
      accountId: vote.accountId,
    });
    if (existingVote) {
      throw new AlreadyVoted();
    }
    this.votes.push(vote);
  }

  delete(infos: { trackId: string; accountId: string }): Promise<void> {
    const index = this.votes.findIndex(
      (vote) =>
        vote.trackId === infos.trackId && vote.accountId === infos.accountId,
    );
    if (index !== -1) {
      this.votes.splice(index, 1);
    }
    return Promise.resolve();
  }

  deleteByTrack(trackId: string): Promise<void> {
    const remainingVotes = this.votes.filter(
      (vote) => vote.trackId !== trackId,
    );
    this.votes.splice(0, this.votes.length, ...remainingVotes);
    return Promise.resolve();
  }
}
