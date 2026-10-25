import { Inject, Injectable } from '@nestjs/common';
import {
  PLAYLIST_REPOSITORY,
  PlaylistRepository,
} from '../../ports/playlist.repository';
import {
  PARTICIPANT_REPOSITORY,
  ParticipantRepository,
} from '../../ports/participant.repository';
import { UpdateParticipantPrivilegeInput } from './update-participant-privilege.contracts';
import { canManageParticipants } from 'src/playlist/domain/playlist-permissions';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotPlaylistOwner } from 'src/playlist/domain/errors/not-playlist-owner.error';
import { ParticipantNotFound } from 'src/playlist/domain/errors/participant-not-found.error';

@Injectable()
export class UpdateParticipantPrivilegeUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
  ) {}

  async execute(input: UpdateParticipantPrivilegeInput): Promise<void> {
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new PlaylistNotFound();
    }
    if (!canManageParticipants(playlist, input.accountId)) {
      throw new NotPlaylistOwner();
    }

    const participant = await this.participantRepository.findById(
      input.participantId,
    );
    if (!participant || participant.playlistId !== playlist.id) {
      throw new ParticipantNotFound();
    }

    // Invitations already sent by this participant stay valid
    participant.hasPrivilege = input.hasPrivilege;
    await this.participantRepository.save(participant);
  }
}
