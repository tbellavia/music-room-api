import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TrackRepository } from 'src/playlist/application/ports/track.repository';
import { Track } from 'src/playlist/domain/track.entity';
import { TrackAlreadyInPlaylist } from 'src/playlist/domain/errors/track-already-in-playlist.error';
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
    );
  }
}
