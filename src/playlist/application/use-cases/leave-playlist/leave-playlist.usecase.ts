import { Inject, Injectable } from '@nestjs/common';
import {
  PLAYLIST_REPOSITORY,
  PlaylistRepository,
} from '../../ports/playlist.repository';
import {
  PARTICIPANT_REPOSITORY,
  ParticipantRepository,
} from '../../ports/participant.repository';
import { LeavePlaylistInput } from './leave-playlist.contracts';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { ParticipantNotFound } from 'src/playlist/domain/errors/participant-not-found.error';

@Injectable()
export class LeavePlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
  ) {}

  async execute(input: LeavePlaylistInput): Promise<void> {
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new PlaylistNotFound();
    }

    // Leaving is always allowed, whatever the period or the position.
    // The owner has no participant row, so they cannot leave their playlist.
    const participant =
      await this.participantRepository.findByPlaylistAndAccount({
        playlistId: playlist.id,
        accountId: input.accountId,
      });
    if (!participant) {
      throw new ParticipantNotFound();
    }

    await this.participantRepository.delete(participant.id);
  }
}
