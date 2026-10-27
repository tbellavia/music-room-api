import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TrackRepository } from 'src/playlist/application/ports/track.repository';
import { Track } from 'src/playlist/domain/track.entity';
import { TrackAlreadyInPlaylist } from 'src/playlist/domain/errors/track-already-in-playlist.error';
import { TrackVersionConflict } from 'src/playlist/domain/errors/track-version-conflict.error';
import { isUniqueViolation } from 'src/infrastructure/database/error-utils';
import { TrackOrmEntity } from './typeorm-track.entity';

@Injectable()
export class TypeOrmTrackRepository implements TrackRepository {
  constructor(
    @InjectRepository(TrackOrmEntity)
    private readonly repository: Repository<TrackOrmEntity>,
  ) {}

  async findById(id: string): Promise<Track | null> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      return null;
    }
    return this.toDomain(entity);
  }

  async findUnplayedByPlaylist(playlistId: string): Promise<Track[]> {
    const entities = await this.repository.findBy({
      playlist_id: playlistId,
      played_at: IsNull(),
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findUnplayedByPlaylistAndVideo(infos: {
    playlistId: string;
    videoId: string;
  }): Promise<Track | null> {
    const entity = await this.repository.findOneBy({
      playlist_id: infos.playlistId,
      video_id: infos.videoId,
      played_at: IsNull(),
    });

    if (!entity) {
      return null;
    }
    return this.toDomain(entity);
  }

  async countUnplayedByPlaylist(playlistId: string): Promise<number> {
    return await this.repository.countBy({
      playlist_id: playlistId,
      played_at: IsNull(),
    });
  }

  async save(track: Track): Promise<void> {
    try {
      await this.repository.save(this.toOrm(track));
    } catch (error) {
      // Two concurrent additions of the same music can both pass the use-case check
      if (isUniqueViolation(error)) {
        throw new TrackAlreadyInPlaylist();
      }
      throw error;
    }
  }

  // Optimistic locking: the WHERE on the version and the write happen in one
  // atomic statement, so two concurrent moves of the same track cannot both pass
  async updatePosition(infos: {
    trackId: string;
    position: number;
    expectedVersion: number;
  }): Promise<void> {
    const result = await this.repository.update(
      { id: infos.trackId, version: infos.expectedVersion },
      { position: infos.position, version: infos.expectedVersion + 1 },
    );
    if (result.affected === 0) {
      throw new TrackVersionConflict();
    }
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  private toOrm(track: Track): TrackOrmEntity {
    return {
      id: track.id,
      playlist_id: track.playlistId,
      video_id: track.videoId,
      name: track.name,
      artist: track.artist,
      thumbnail: track.thumbnail,
      duration: track.duration,
      added_by: track.addedBy,
      added_at: track.addedAt,
      played_at: track.playedAt,
      position: track.position,
      version: track.version,
    };
  }

  private toDomain(orm: TrackOrmEntity): Track {
    return new Track(
      orm.id,
      orm.playlist_id,
      orm.video_id,
      orm.name,
      orm.artist,
      orm.thumbnail,
      orm.duration,
      orm.added_by,
      orm.added_at,
      orm.played_at,
      orm.position,
      orm.version,
    );
  }
}
