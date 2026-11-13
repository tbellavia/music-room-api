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
  MyPlaylist,
  OWNER_MEMBERSHIP,
  toMyPlaylist,
} from 'src/playlist/application/my-playlist';
import { PlaylistRole } from 'src/playlist/domain/playlist-role.enum';

@Injectable()
export class ListMyPlaylistsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
  ) {}

  async execute(input: ListMyPlaylistsInput): Promise<ListMyPlaylistsOutput> {
    const now = new Date();
    const ownedPlaylists = await this.findOwned(input.accountId, now);
    const joinedPlaylists = await this.findJoined(input.accountId, now);

    const filteredPlaylists = [...ownedPlaylists, ...joinedPlaylists].filter(
      (playlist) => this.matchesFilters(playlist, input),
    );

    return {
      playlists: this.sortByCreation(filteredPlaylists, input.order),
    };
  }

  private async findOwned(accountId: string, now: Date): Promise<MyPlaylist[]> {
    const playlists = await this.playlistRepository.findByOwner(accountId);

    return playlists.map((playlist) =>
      toMyPlaylist(playlist, OWNER_MEMBERSHIP, now),
    );
  }

  private async findJoined(
    accountId: string,
    now: Date,
  ): Promise<MyPlaylist[]> {
    const participations =
      await this.participantRepository.findByAccount(accountId);
    const playlistIds = participations.map(
      (participation) => participation.playlistId,
    );
    const playlists = await this.playlistRepository.findByIds(playlistIds);

    const joinedPlaylists: MyPlaylist[] = [];
    for (const playlist of playlists) {
      const participation = participations.find(
        (candidate) => candidate.playlistId === playlist.id,
      );
      if (participation) {
        const membership = {
          role: PlaylistRole.PARTICIPANT,
          hasPrivilege: participation.hasPrivilege,
        };
        joinedPlaylists.push(toMyPlaylist(playlist, membership, now));
      }
    }
    return joinedPlaylists;
  }

  private matchesFilters(
    playlist: MyPlaylist,
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
    playlists: MyPlaylist[],
    order: SortOrder = SortOrder.DESC,
  ): MyPlaylist[] {
    const oldestFirst = playlists.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    if (order === SortOrder.DESC) {
      return oldestFirst.reverse();
    }
    return oldestFirst;
  }
}
