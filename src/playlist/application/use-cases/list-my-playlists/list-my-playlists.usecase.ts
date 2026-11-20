import { Inject, Injectable } from '@nestjs/common';
import {
  PLAYLIST_REPOSITORY,
  PlaylistRepository,
} from '../../ports/playlist.repository';
import {
  PARTICIPANT_REPOSITORY,
  ParticipantRepository,
} from '../../ports/participant.repository';
import {
  ListMyPlaylistsInput,
  ListMyPlaylistsOutput,
  SortOrder,
} from './list-my-playlists.contracts';
import {
  ACCOUNT_DIRECTORY,
  AccountDirectory,
} from '../../ports/account-directory';
import {
  ListedPlaylist,
  OWNER_MEMBERSHIP,
  PlaylistWithMembership,
  findOwnerUsernames,
  participantMembership,
  toListedPlaylist,
} from 'src/playlist/application/listed-playlist';

@Injectable()
export class ListMyPlaylistsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
    @Inject(ACCOUNT_DIRECTORY)
    private readonly accountDirectory: AccountDirectory,
  ) {}

  async execute(input: ListMyPlaylistsInput): Promise<ListMyPlaylistsOutput> {
    const now = new Date();
    const ownedPlaylists = await this.findOwned(input.accountId);
    const joinedPlaylists = await this.findJoined(input.accountId);
    const memberPlaylists = [...ownedPlaylists, ...joinedPlaylists];

    const usernameById = await findOwnerUsernames(
      this.accountDirectory,
      memberPlaylists.map((memberPlaylist) => memberPlaylist.playlist),
    );
    // No position: the caller is a member, there is nothing to join
    const context = { usernameById, position: null, now };
    const filteredPlaylists = memberPlaylists
      .map((memberPlaylist) => toListedPlaylist(memberPlaylist, context))
      .filter((playlist) => this.matchesFilters(playlist, input));

    return {
      playlists: this.sortByCreation(filteredPlaylists, input.order),
    };
  }

  private async findOwned(
    accountId: string,
  ): Promise<PlaylistWithMembership[]> {
    const playlists = await this.playlistRepository.findByOwner(accountId);

    return playlists.map((playlist) => ({
      playlist,
      membership: OWNER_MEMBERSHIP,
    }));
  }

  private async findJoined(
    accountId: string,
  ): Promise<PlaylistWithMembership[]> {
    const participations =
      await this.participantRepository.findByAccount(accountId);
    const playlistIds = participations.map(
      (participation) => participation.playlistId,
    );
    const playlists = await this.playlistRepository.findByIds(playlistIds);

    const joinedPlaylists: PlaylistWithMembership[] = [];
    for (const playlist of playlists) {
      const participation = participations.find(
        (candidate) => candidate.playlistId === playlist.id,
      );
      if (participation) {
        const membership = participantMembership(participation);
        joinedPlaylists.push({ playlist, membership });
      }
    }
    return joinedPlaylists;
  }

  private matchesFilters(
    playlist: ListedPlaylist,
    input: ListMyPlaylistsInput,
  ): boolean {
    if (input.role !== undefined && playlist.role !== input.role) {
      return false;
    }
    if (input.status !== undefined && playlist.status !== input.status) {
      return false;
    }
    return true;
  }

  private sortByCreation(
    playlists: ListedPlaylist[],
    order: SortOrder = SortOrder.DESC,
  ): ListedPlaylist[] {
    const oldestFirst = playlists.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    if (order === SortOrder.DESC) {
      return oldestFirst.reverse();
    }
    return oldestFirst;
  }
}
