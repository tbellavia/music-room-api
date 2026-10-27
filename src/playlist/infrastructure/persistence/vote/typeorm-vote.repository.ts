import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { VoteRepository } from 'src/playlist/application/ports/vote.repository';
import { TrackVote } from 'src/playlist/domain/track-vote.entity';
import { AlreadyVoted } from 'src/playlist/domain/errors/already-voted.error';
import { isUniqueViolation } from 'src/infrastructure/database/error-utils';
import { TrackVoteOrmEntity } from './typeorm-track-vote.entity';

@Injectable()
export class TypeOrmVoteRepository implements VoteRepository {
  constructor(
    @InjectRepository(TrackVoteOrmEntity)
    private readonly repository: Repository<TrackVoteOrmEntity>,
  ) {}

  async findByTrackAndAccount(infos: {
    trackId: string;
    accountId: string;
  }): Promise<TrackVote | null> {
    const entity = await this.repository.findOneBy({
      track_id: infos.trackId,
      account_id: infos.accountId,
    });

    if (!entity) {
      return null;
    }
    return this.toDomain(entity);
  }

  async findByTracks(trackIds: string[]): Promise<TrackVote[]> {
    if (trackIds.length === 0) {
      return [];
    }
    const entities = await this.repository.findBy({ track_id: In(trackIds) });

    return entities.map((entity) => this.toDomain(entity));
  }

  async countByTrack(trackId: string): Promise<number> {
    return await this.repository.countBy({ track_id: trackId });
  }

  // insert, not save: save would silently update an existing vote
  async add(vote: TrackVote): Promise<void> {
    try {
      await this.repository.insert(this.toOrm(vote));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AlreadyVoted();
      }
      throw error;
    }
  }

  async delete(infos: { trackId: string; accountId: string }): Promise<void> {
    await this.repository.delete({
      track_id: infos.trackId,
      account_id: infos.accountId,
    });
  }

  async deleteByTrack(trackId: string): Promise<void> {
    await this.repository.delete({ track_id: trackId });
  }

  private toOrm(vote: TrackVote): TrackVoteOrmEntity {
    return {
      track_id: vote.trackId,
      account_id: vote.accountId,
    };
  }

  private toDomain(orm: TrackVoteOrmEntity): TrackVote {
    return new TrackVote(orm.track_id, orm.account_id);
  }
}
