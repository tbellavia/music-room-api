import { Inject, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  PLAYLIST_REPOSITORY,
  PlaylistRepository,
} from '../../ports/playlist.repository';
import {
  PARTICIPANT_REPOSITORY,
  ParticipantRepository,
} from '../../ports/participant.repository';
import {
  PLAYLIST_EVENT_BUS,
  PlaylistEvent,
  PlaylistEventBus,
} from '../../ports/playlist-event-bus';
import { WatchPlaylistEventsInput } from './watch-playlist-events.contracts';
import { canRead } from 'src/playlist/domain/playlist-permissions';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotPlaylistMember } from 'src/playlist/domain/errors/not-playlist-member.error';

@Injectable()
export class WatchPlaylistEventsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
    @Inject(PLAYLIST_EVENT_BUS)
    private readonly eventBus: PlaylistEventBus,
  ) {}

  // Same access rule as reading the tracks: whoever can read can watch
  async execute(
    input: WatchPlaylistEventsInput,
  ): Promise<Observable<PlaylistEvent>> {
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new PlaylistNotFound();
    }

    const participant =
      await this.participantRepository.findByPlaylistAndAccount({
        playlistId: playlist.id,
        accountId: input.accountId,
      });
    if (!canRead(playlist, input.accountId, participant)) {
      throw new NotPlaylistMember();
    }

    return this.eventBus.streamFor(playlist.id);
  }
}
