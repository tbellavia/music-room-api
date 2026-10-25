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
  ACCOUNT_DIRECTORY,
  AccountDirectory,
} from '../../ports/account-directory';
import {
  ListParticipantsInput,
  ListParticipantsOutput,
  PlaylistParticipant,
} from './list-participants.contracts';
import { isMember } from 'src/playlist/domain/playlist-permissions';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotPlaylistMember } from 'src/playlist/domain/errors/not-playlist-member.error';

@Injectable()
export class ListParticipantsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
    @Inject(ACCOUNT_DIRECTORY)
    private readonly accountDirectory: AccountDirectory,
  ) {}

  async execute(input: ListParticipantsInput): Promise<ListParticipantsOutput> {
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new PlaylistNotFound();
    }

    const callerParticipant =
      await this.participantRepository.findByPlaylistAndAccount({
        playlistId: playlist.id,
        accountId: input.accountId,
      });
    if (!isMember(playlist, input.accountId, callerParticipant)) {
      throw new NotPlaylistMember();
    }

    const participants = await this.participantRepository.findByPlaylist(
      playlist.id,
    );

    const accountIds = [
      playlist.ownerId,
      ...participants.map((participant) => participant.accountId),
    ];
    const accounts = await this.accountDirectory.findByIds(accountIds);
    const usernameById = new Map<string, string>();
    for (const account of accounts) {
      usernameById.set(account.id, account.username);
    }

    const playlistParticipants: PlaylistParticipant[] = participants.map(
      (participant) => ({
        participantId: participant.id,
        accountId: participant.accountId,
        username: usernameById.get(participant.accountId) ?? null,
        hasPrivilege: participant.hasPrivilege,
      }),
    );

    return {
      owner: {
        accountId: playlist.ownerId,
        username: usernameById.get(playlist.ownerId) ?? null,
      },
      participants: playlistParticipants,
    };
  }
}
