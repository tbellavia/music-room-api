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
  ACCOUNT_DIRECTORY,
  AccountDirectory,
} from '../../ports/account-directory';
import {
  OWNER_MEMBERSHIP,
  findOwnerUsernames,
  toListedPlaylist,
} from 'src/playlist/application/listed-playlist';

export const RECENT_PLAYLISTS_LIMIT = 10;

@Injectable()
export class ListMyRecentPlaylistsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(ACCOUNT_DIRECTORY)
    private readonly accountDirectory: AccountDirectory,
  ) {}

  async execute(
    input: ListMyRecentPlaylistsInput,
  ): Promise<ListMyRecentPlaylistsOutput> {
    const now = new Date();
    const playlists = await this.playlistRepository.findRecentByOwner(
      input.accountId,
      RECENT_PLAYLISTS_LIMIT,
    );

    // Always the caller here: kept for the shared format with GET /playlists/me
    const usernameById = await findOwnerUsernames(
      this.accountDirectory,
      playlists,
    );

    const context = { usernameById, position: null, now };

    return {
      playlists: playlists.map((playlist) =>
        toListedPlaylist({ playlist, membership: OWNER_MEMBERSHIP }, context),
      ),
    };
  }
}
