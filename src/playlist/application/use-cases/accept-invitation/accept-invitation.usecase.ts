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
  AcceptInvitationInput,
  AcceptInvitationOutput,
} from './accept-invitation.contracts';
import { Participant } from 'src/playlist/domain/participant.entity';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { InvitationNotFound } from 'src/playlist/domain/errors/invitation-not-found.error';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { PlaylistEnded } from 'src/playlist/domain/errors/playlist-ended.error';
import { AlreadyParticipant } from 'src/playlist/domain/errors/already-participant.error';

@Injectable()
export class AcceptInvitationUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: InvitationRepository,
  ) {}

  async execute(input: AcceptInvitationInput): Promise<AcceptInvitationOutput> {
    const invitation = await this.invitationRepository.findById(
      input.invitationId,
    );
    // Only the invitee can accept: for anyone else the invitation does not exist
    if (!invitation || !invitation.isInvitee(input.accountId)) {
      throw new InvitationNotFound();
    }

    const playlist = await this.playlistRepository.findById(
      invitation.playlistId,
    );
    if (!playlist) {
      throw new PlaylistNotFound();
    }
    // No zone or start check here: an invitation can be accepted in advance,
    // the participant just cannot act on the playlist until they are on site
    if (playlist.hasEnded()) {
      throw new PlaylistEnded();
    }

    const existingParticipant =
      await this.participantRepository.findByPlaylistAndAccount({
        playlistId: playlist.id,
        accountId: input.accountId,
      });
    if (existingParticipant) {
      throw new AlreadyParticipant();
    }

    const participant = Participant.create({
      id: randomUUID(),
      playlistId: playlist.id,
      accountId: input.accountId,
      joinedVia: JoinMethod.INVITATION,
    });
    await this.participantRepository.save(participant);
    await this.invitationRepository.delete(invitation.id);

    return {
      participantId: participant.id,
    };
  }
}
