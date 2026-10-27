import { Inject, Injectable } from '@nestjs/common';
import {
  PLAYLIST_REPOSITORY,
  PlaylistRepository,
} from '../../ports/playlist.repository';
import {
  TRACK_REPOSITORY,
  TrackRepository,
} from '../../ports/track.repository';
import {
  PLAYLIST_EVENT_BUS,
  PlaylistEventBus,
} from '../../ports/playlist-event-bus';
import { MarkTrackPlayedInput } from './mark-track-played.contracts';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotAVotePlaylist } from 'src/playlist/domain/errors/not-a-vote-playlist.error';
import { NotPlaylistOwner } from 'src/playlist/domain/errors/not-playlist-owner.error';
import { TrackNotFound } from 'src/playlist/domain/errors/track-not-found.error';

@Injectable()
export class MarkTrackPlayedUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: TrackRepository,
    @Inject(PLAYLIST_EVENT_BUS)
    private readonly eventBus: PlaylistEventBus,
  ) {}

  async execute(input: MarkTrackPlayedInput): Promise<void> {
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new PlaylistNotFound();
    }
    if (!playlist.isVotePlaylist()) {
      throw new NotAVotePlaylist();
    }
    // The owner's device is the one playing the music
    if (!playlist.isOwner(input.accountId)) {
      throw new NotPlaylistOwner();
    }

    // Marked by id, not "the first of the ranking": two devices of the owner
    // reporting the same track cannot skip two tracks at once
    const track = await this.trackRepository.findById(input.trackId);
    if (!track || track.playlistId !== playlist.id) {
      throw new TrackNotFound();
    }
    track.markAsPlayed();
    await this.trackRepository.save(track);

    this.eventBus.publish({
      type: 'track.played',
      playlistId: playlist.id,
      trackId: track.id,
    });
  }
}
