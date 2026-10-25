import { Inject, Injectable } from '@nestjs/common';
import {
  PLAYLIST_REPOSITORY,
  PlaylistRepository,
} from '../../ports/playlist.repository';
import {
  PARTICIPANT_REPOSITORY,
  ParticipantRepository,
} from '../../ports/participant.repository';
import { RemoveParticipantInput } from './remove-participant.contracts';
import { canManageParticipants } from 'src/playlist/domain/playlist-permissions';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotPlaylistOwner } from 'src/playlist/domain/errors/not-playlist-owner.error';
import { ParticipantNotFound } from 'src/playlist/domain/errors/participant-not-found.error';

@Injectable()
export class RemoveParticipantUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
  ) {}

  async execute(input: RemoveParticipantInput): Promise<void> {
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new PlaylistNotFound();
    }
    if (!canManageParticipants(playlist, input.accountId)) {
      throw new NotPlaylistOwner();
    }

    // The owner has no participant row, so they can never be removed
    const participant = await this.participantRepository.findById(
      input.participantId,
    );
    if (!participant || participant.playlistId !== playlist.id) {
      throw new ParticipantNotFound();
    }

    await this.participantRepository.delete(participant.id);
  }
}
