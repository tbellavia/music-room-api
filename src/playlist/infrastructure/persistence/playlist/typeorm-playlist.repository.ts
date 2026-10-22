import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaylistRepository } from 'src/playlist/application/ports/playlist.repository';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { PlaylistAlreadyExists } from 'src/playlist/domain/errors/playlist-already-exists.error';
import { isUniqueViolation } from 'src/infrastructure/database/error-utils';
import { PlaylistOrmEntity } from './typeorm-playlist.entity';

@Injectable()
export class TypeOrmPlaylistRepository implements PlaylistRepository {
  constructor(
    @InjectRepository(PlaylistOrmEntity)
    private readonly repository: Repository<PlaylistOrmEntity>,
  ) {}

  async findByOwnerAndName(infos: {
    ownerId: string;
    name: string;
  }): Promise<Playlist | null> {
    const entity = await this.repository.findOneBy({
      owner_id: infos.ownerId,
      name: infos.name,
    });

    if (!entity) {
      return null;
    }
    return this.toDomain(entity);
  }

  async findById(id: string): Promise<Playlist | null> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      return null;
    }
    return this.toDomain(entity);
  }

  async findPublic(): Promise<Playlist[]> {
    const entities = await this.repository.findBy({ is_private: false });

    return entities.map((entity) => this.toDomain(entity));
  }

  async save(playlist: Playlist): Promise<void> {
    try {
      await this.repository.save(this.toOrm(playlist));
    } catch (error) {
      // Two concurrent creations can both pass the use-case check
      if (isUniqueViolation(error)) {
        throw new PlaylistAlreadyExists();
      }
      throw error;
    }
  }

  private toOrm(playlist: Playlist): PlaylistOrmEntity {
    return {
      id: playlist.id,
      type: playlist.type,
      owner_id: playlist.ownerId,
      name: playlist.name,
      description: playlist.description,
      is_private: playlist.isPrivate,
      begin_at: playlist.beginAt,
      end_at: playlist.endAt,
      latitude: playlist.latitude,
      longitude: playlist.longitude,
      cover_path: playlist.coverPath,
    };
  }

  private toDomain(orm: PlaylistOrmEntity): Playlist {
    return new Playlist(
      orm.id,
      orm.type,
      orm.owner_id,
      orm.name,
      orm.description,
      orm.is_private,
      orm.begin_at,
      orm.end_at,
      orm.latitude,
      orm.longitude,
      orm.cover_path,
    );
  }
}
