import { Inject, Injectable } from '@nestjs/common';
import {
  PLAYLIST_REPOSITORY,
  PlaylistRepository,
} from '../../ports/playlist.repository';
import {
  ListPublicPlaylistsOutput,
  PublicPlaylist,
} from './list-public-playlists.contracts';
import {
  ACCOUNT_DIRECTORY,
  AccountDirectory,
} from '../../ports/account-directory';
import { Playlist } from 'src/playlist/domain/playlist.entity';

@Injectable()
export class ListPublicPlaylistsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(ACCOUNT_DIRECTORY)
    private readonly accountDirectory: AccountDirectory,
  ) {}

  async execute(): Promise<ListPublicPlaylistsOutput> {
    const now = new Date();
    const publicPlaylists = await this.playlistRepository.findPublic();

    // Ended playlists can no longer be joined, there is no point listing them
    const joinablePlaylists = publicPlaylists.filter(
      (playlist) => !playlist.hasEnded(now),
    );

    const usernameById = await this.findOwnerUsernames(joinablePlaylists);

    return {
      playlists: joinablePlaylists.map((playlist) =>
        this.toOutput(playlist, usernameById),
      ),
    };
  }

  // One lookup for the whole list
  private async findOwnerUsernames(
    playlists: Playlist[],
  ): Promise<Map<string, string>> {
    const ownerIds = playlists.map((playlist) => playlist.ownerId);
    const owners = await this.accountDirectory.findByIds(ownerIds);
    const usernameById = new Map<string, string>();
    for (const owner of owners) {
      usernameById.set(owner.id, owner.username);
    }
    return usernameById;
  }

  private toOutput(
    playlist: Playlist,
    usernameById: Map<string, string>,
  ): PublicPlaylist {
    return {
      id: playlist.id,
      type: playlist.type,
      license: playlist.license,
      ownerId: playlist.ownerId,
      ownerUsername: usernameById.get(playlist.ownerId) ?? null,
      name: playlist.name,
      description: playlist.description,
      beginAt: playlist.beginAt,
      endAt: playlist.endAt,
      latitude: playlist.latitude,
      longitude: playlist.longitude,
      address: playlist.address,
      coverPath: playlist.coverPath,
    };
  }
}
