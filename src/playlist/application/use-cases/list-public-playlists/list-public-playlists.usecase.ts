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
  ListPublicPlaylistsInput,
  ListPublicPlaylistsOutput,
} from './list-public-playlists.contracts';
import {
  ACCOUNT_DIRECTORY,
  AccountDirectory,
} from '../../ports/account-directory';
import {
  findOwnerUsernames,
  findParticipationsByPlaylist,
  membershipOf,
  toListedPlaylist,
} from 'src/playlist/application/listed-playlist';

@Injectable()
export class ListPublicPlaylistsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
    @Inject(ACCOUNT_DIRECTORY)
    private readonly accountDirectory: AccountDirectory,
  ) {}

  async execute(
    input: ListPublicPlaylistsInput,
  ): Promise<ListPublicPlaylistsOutput> {
    const now = new Date();
    const publicPlaylists = await this.playlistRepository.findPublic();

    // Ended playlists can no longer be joined, there is no point listing them
    const joinablePlaylists = publicPlaylists.filter(
      (playlist) => !playlist.hasEnded(now),
    );

    const usernameById = await findOwnerUsernames(
      this.accountDirectory,
      joinablePlaylists,
    );
    const participationByPlaylistId = await findParticipationsByPlaylist(
      this.participantRepository,
      input.accountId,
    );
    const context = { usernameById, position: input.position, now };

    return {
      playlists: joinablePlaylists.map((playlist) => {
        const membership = membershipOf(
          playlist,
          input.accountId,
          participationByPlaylistId,
        );
        return toListedPlaylist({ playlist, membership }, context);
      }),
    };
  }
}
