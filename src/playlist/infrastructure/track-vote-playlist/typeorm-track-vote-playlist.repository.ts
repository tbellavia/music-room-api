import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TrackVotePlaylistRepository } from 'src/playlist/application/ports/track-vote-playlist.repository';
import { TrackVotePlaylist } from 'src/playlist/domain/track-vote-playlist.entity';
import { TrackVotePlaylistOrmEntity } from './typeorm-track-vote-playlist.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TypeOrmTrackVotePlaylistRepository implements TrackVotePlaylistRepository {
  constructor(
    @InjectRepository(TrackVotePlaylistOrmEntity)
    private readonly repository: Repository<TrackVotePlaylistOrmEntity>,
  ) {}

  async findByCreatorAndPlaylistName(infos: {
    creatorId: string;
    playlistName: string;
  }): Promise<TrackVotePlaylist | null> {
    const playlist = await this.repository.findOneBy({
      creator: { id: infos.creatorId },
      name: infos.playlistName,
    });

    if (!playlist) return null;
    return this.toDomain(playlist);
  }

  async find(id: string): Promise<TrackVotePlaylist> {
    throw new Error('Not implemented');
  }

  async save(playlist: TrackVotePlaylist): Promise<void> {
    throw new Error('Not implemented');
  }

  toDomain(playlist: TrackVotePlaylistOrmEntity): TrackVotePlaylist {
    return TrackVotePlaylist.create({
      id: playlist.id,
      creatorId: playlist.creator.id,
      name: playlist.name,
      description: playlist.description,
      begin: playlist.begin,
      end: playlist.end,
      latitude: playlist.latitude,
      longitude: playlist.longitude,
      cover_path: playlist.cover_path,
      participantIds: playlist.participants.map(
        (participant) => participant.id,
      ),
    });
  }
}
