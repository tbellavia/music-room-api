import { Inject, Injectable } from '@nestjs/common';
import {
  PLAYLIST_REPOSITORY,
  PlaylistRepository,
} from '../../ports/playlist.repository';
import {
  ListPublicPlaylistsOutput,
  PublicPlaylist,
} from './list-public-playlists.contracts';
import { Playlist } from 'src/playlist/domain/playlist.entity';

@Injectable()
export class ListPublicPlaylistsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(): Promise<ListPublicPlaylistsOutput> {
    const now = new Date();
    const publicPlaylists = await this.playlistRepository.findPublic();

    // Ended playlists can no longer be joined, there is no point listing them
    const joinablePlaylists = publicPlaylists.filter(
      (playlist) => !playlist.hasEnded(now),
    );

    return {
      playlists: joinablePlaylists.map((playlist) => this.toOutput(playlist)),
    };
  }

  private toOutput(playlist: Playlist): PublicPlaylist {
    return {
      id: playlist.id,
      type: playlist.type,
      license: playlist.license,
      ownerId: playlist.ownerId,
      name: playlist.name,
      description: playlist.description,
      beginAt: playlist.beginAt,
      endAt: playlist.endAt,
      latitude: playlist.latitude,
      longitude: playlist.longitude,
      coverPath: playlist.coverPath,
    };
  }
}
