import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  PLAYLIST_REPOSITORY,
  PlaylistRepository,
} from '../../ports/playlist.repository';
import {
  CreatePlaylistInput,
  CreatePlaylistOutput,
} from './create-playlist.contracts';
import { PlaylistAlreadyExists } from 'src/playlist/domain/errors/playlist-already-exists.error';
import { PlaylistEndInPast } from 'src/playlist/domain/errors/playlist-end-in-past.error';
import { Playlist } from 'src/playlist/domain/playlist.entity';

@Injectable()
export class CreatePlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(input: CreatePlaylistInput): Promise<CreatePlaylistOutput> {
    const found = await this.playlistRepository.findByOwnerAndName({
      ownerId: input.ownerId,
      name: input.name,
    });
    if (found) {
      throw new PlaylistAlreadyExists();
    }

    // Only checked at creation: an existing playlist is expected to end some day
    const now = new Date();
    if (input.endAt && input.endAt <= now) {
      throw new PlaylistEndInPast();
    }

    const playlist = Playlist.create({
      id: randomUUID(),
      type: input.type,
      ownerId: input.ownerId,
      name: input.name,
      description: input.description,
      isPrivate: input.isPrivate,
      license: input.license,
      beginAt: input.beginAt,
      endAt: input.endAt,
      latitude: input.latitude,
      longitude: input.longitude,
    });

    await this.playlistRepository.save(playlist);

    return {
      id: playlist.id,
    };
  }
}
