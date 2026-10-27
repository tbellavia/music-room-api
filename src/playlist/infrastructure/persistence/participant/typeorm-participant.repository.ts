import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParticipantRepository } from 'src/playlist/application/ports/participant.repository';
import { Participant } from 'src/playlist/domain/participant.entity';
import { AlreadyParticipant } from 'src/playlist/domain/errors/already-participant.error';
import { isUniqueViolation } from 'src/infrastructure/database/error-utils';
import { ParticipantOrmEntity } from './typeorm-participant.entity';

@Injectable()
export class TypeOrmParticipantRepository implements ParticipantRepository {
  constructor(
    @InjectRepository(ParticipantOrmEntity)
    private readonly repository: Repository<ParticipantOrmEntity>,
  ) {}

  async findById(id: string): Promise<Participant | null> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      return null;
    }
    return this.toDomain(entity);
  }

  async findByPlaylist(playlistId: string): Promise<Participant[]> {
    const entities = await this.repository.findBy({ playlist_id: playlistId });

    return entities.map((entity) => this.toDomain(entity));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async findByPlaylistAndAccount(infos: {
    playlistId: string;
    accountId: string;
  }): Promise<Participant | null> {
    const entity = await this.repository.findOneBy({
      playlist_id: infos.playlistId,
      account_id: infos.accountId,
    });

    if (!entity) {
      return null;
    }
    return this.toDomain(entity);
  }

  async save(participant: Participant): Promise<void> {
    try {
      await this.repository.save(this.toOrm(participant));
    } catch (error) {
      // Two concurrent joins can both pass the use-case check
      if (isUniqueViolation(error)) {
        throw new AlreadyParticipant();
      }
      throw error;
    }
  }

  private toOrm(participant: Participant): ParticipantOrmEntity {
    return {
      id: participant.id,
      playlist_id: participant.playlistId,
      account_id: participant.accountId,
      has_privilege: participant.hasPrivilege,
      joined_via: participant.joinedVia,
    };
  }

  private toDomain(orm: ParticipantOrmEntity): Participant {
    return new Participant(
      orm.id,
      orm.playlist_id,
      orm.account_id,
      orm.has_privilege,
      orm.joined_via,
    );
  }
}
