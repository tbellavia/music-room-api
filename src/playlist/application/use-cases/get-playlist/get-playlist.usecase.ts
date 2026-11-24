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
  INVITATION_REPOSITORY,
  InvitationRepository,
} from '../../ports/invitation.repository';
import {
  ACCOUNT_DIRECTORY,
  AccountDirectory,
} from '../../ports/account-directory';
import { GetPlaylistInput, GetPlaylistOutput } from './get-playlist.contracts';
import {
  Membership,
  OWNER_MEMBERSHIP,
  findOwnerUsernames,
  participantMembership,
  toListedPlaylist,
} from 'src/playlist/application/listed-playlist';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { Participant } from 'src/playlist/domain/participant.entity';
import { canRead } from 'src/playlist/domain/playlist-permissions';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotPlaylistMember } from 'src/playlist/domain/errors/not-playlist-member.error';

@Injectable()
export class GetPlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: InvitationRepository,
    @Inject(ACCOUNT_DIRECTORY)
    private readonly accountDirectory: AccountDirectory,
  ) {}

  async execute(input: GetPlaylistInput): Promise<GetPlaylistOutput> {
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new PlaylistNotFound();
    }

    const participant =
      await this.participantRepository.findByPlaylistAndAccount({
        playlistId: playlist.id,
        accountId: input.accountId,
      });
    const canSee = await this.canSee(playlist, input.accountId, participant);
    if (!canSee) {
      throw new NotPlaylistMember();
    }

    const usernameById = await findOwnerUsernames(this.accountDirectory, [
      playlist,
    ]);
    const membership = this.membershipOf(
      playlist,
      input.accountId,
      participant,
    );
    return toListedPlaylist(
      { playlist, membership },
      { usernameById, position: input.position, now: new Date() },
    );
  }

  // An invitee sees a private playlist before accepting, to decide
  private async canSee(
    playlist: Playlist,
    accountId: string,
    participant: Participant | null,
  ): Promise<boolean> {
    if (canRead(playlist, accountId, participant)) {
      return true;
    }
    const invitation = await this.invitationRepository.findByPlaylistAndInvitee(
      { playlistId: playlist.id, inviteeId: accountId },
    );
    return invitation !== null;
  }

  private membershipOf(
    playlist: Playlist,
    accountId: string,
    participant: Participant | null,
  ): Membership | null {
    if (playlist.isOwner(accountId)) {
      return OWNER_MEMBERSHIP;
    }
    if (participant === null) {
      return null;
    }
    return participantMembership(participant);
  }
}
