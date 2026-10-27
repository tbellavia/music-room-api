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
  JoinPlaylistInput,
  JoinPlaylistOutput,
} from './join-playlist.contracts';
import { Participant } from 'src/playlist/domain/participant.entity';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { PrivatePlaylist } from 'src/playlist/domain/errors/private-playlist.error';
import { PlaylistEnded } from 'src/playlist/domain/errors/playlist-ended.error';
import { PlaylistNotStarted } from 'src/playlist/domain/errors/playlist-not-started.error';
import { AlreadyParticipant } from 'src/playlist/domain/errors/already-participant.error';
import { OutsidePlaylistZone } from 'src/playlist/domain/errors/outside-playlist-zone.error';

@Injectable()
export class JoinPlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
  ) {}

  async execute(input: JoinPlaylistInput): Promise<JoinPlaylistOutput> {
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new PlaylistNotFound();
    }
    if (playlist.isPrivate) {
      throw new PrivatePlaylist();
    }
    if (playlist.hasEnded()) {
      throw new PlaylistEnded();
    }
    if (!playlist.hasBegun()) {
      throw new PlaylistNotStarted();
    }

    // The owner is implicitly a member of their own playlist
    if (playlist.isOwner(input.accountId)) {
      throw new AlreadyParticipant();
    }
    await this.throwIfAlreadyParticipant(input);

    const position = {
      latitude: input.latitude,
      longitude: input.longitude,
    };
    if (!playlist.isWithinZone(position)) {
      throw new OutsidePlaylistZone();
    }

    const participant = Participant.create({
      id: randomUUID(),
      playlistId: playlist.id,
      accountId: input.accountId,
      joinedVia: JoinMethod.JOIN,
    });
    await this.participantRepository.save(participant);

    return {
      participantId: participant.id,
    };
  }

  private async throwIfAlreadyParticipant(input: JoinPlaylistInput) {
    const participant =
      await this.participantRepository.findByPlaylistAndAccount({
        playlistId: input.playlistId,
        accountId: input.accountId,
      });
    if (participant) {
      throw new AlreadyParticipant();
    }
  }
}
