import { Inject, Injectable } from '@nestjs/common';
import {
  PLAYLIST_REPOSITORY,
  PlaylistRepository,
} from '../../ports/playlist.repository';
import {
  ListMyRecentPlaylistsInput,
  ListMyRecentPlaylistsOutput,
} from './list-my-recent-playlists.contracts';
import {
  OWNER_MEMBERSHIP,
  toMyPlaylist,
} from 'src/playlist/application/my-playlist';

export const RECENT_PLAYLISTS_LIMIT = 10;

@Injectable()
export class ListMyRecentPlaylistsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(
    input: ListMyRecentPlaylistsInput,
  ): Promise<ListMyRecentPlaylistsOutput> {
    const now = new Date();
    const playlists = await this.playlistRepository.findRecentByOwner(
      input.accountId,
      RECENT_PLAYLISTS_LIMIT,
    );

    return {
      playlists: playlists.map((playlist) =>
        toMyPlaylist(playlist, OWNER_MEMBERSHIP, now),
      ),
    };
  }
}
