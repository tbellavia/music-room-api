import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
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
import {
  InviteParticipantInput,
  InviteParticipantOutput,
} from './invite-participant.contracts';
import { Invitation } from 'src/playlist/domain/invitation.entity';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { canInvite } from 'src/playlist/domain/playlist-permissions';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { PlaylistEnded } from 'src/playlist/domain/errors/playlist-ended.error';
import { InvitationForbidden } from 'src/playlist/domain/errors/invitation-forbidden.error';
import { InviteeNotFound } from 'src/playlist/domain/errors/invitee-not-found.error';
import { AlreadyParticipant } from 'src/playlist/domain/errors/already-participant.error';
import { InvitationAlreadyExists } from 'src/playlist/domain/errors/invitation-already-exists.error';

@Injectable()
export class InviteParticipantUseCase {
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

  async execute(
    input: InviteParticipantInput,
  ): Promise<InviteParticipantOutput> {
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new PlaylistNotFound();
    }
    if (playlist.hasEnded()) {
      throw new PlaylistEnded();
    }

    await this.throwIfInviterNotAllowed(playlist, input);
    await this.throwIfInviteeCannotBeInvited(playlist, input.inviteeId);

    const invitation = Invitation.create({
      id: randomUUID(),
      playlistId: playlist.id,
      inviterId: input.inviterId,
      inviteeId: input.inviteeId,
    });
    await this.invitationRepository.save(invitation);

    return {
      invitationId: invitation.id,
    };
  }

  private async throwIfInviterNotAllowed(
    playlist: Playlist,
    input: InviteParticipantInput,
  ) {
    const inviterParticipant =
      await this.participantRepository.findByPlaylistAndAccount({
        playlistId: playlist.id,
        accountId: input.inviterId,
      });
    // No period or zone check: inviting is allowed from anywhere, at any time
    if (!canInvite(playlist, input.inviterId, inviterParticipant)) {
      throw new InvitationForbidden();
    }
  }

  private async throwIfInviteeCannotBeInvited(
    playlist: Playlist,
    inviteeId: string,
  ) {
    const invitee = await this.accountDirectory.findById(inviteeId);
    if (!invitee) {
      throw new InviteeNotFound();
    }

    if (playlist.isOwner(inviteeId)) {
      throw new AlreadyParticipant();
    }
    const inviteeParticipant =
      await this.participantRepository.findByPlaylistAndAccount({
        playlistId: playlist.id,
        accountId: inviteeId,
      });
    if (inviteeParticipant) {
      throw new AlreadyParticipant();
    }

    const pendingInvitation =
      await this.invitationRepository.findByPlaylistAndInvitee({
        playlistId: playlist.id,
        inviteeId,
      });
    if (pendingInvitation) {
      throw new InvitationAlreadyExists();
    }
  }
}
