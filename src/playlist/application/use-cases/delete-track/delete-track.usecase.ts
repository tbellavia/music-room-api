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
  TRACK_REPOSITORY,
  TrackRepository,
} from '../../ports/track.repository';
import { VOTE_REPOSITORY, VoteRepository } from '../../ports/vote.repository';
import {
  PLAYLIST_EVENT_BUS,
  PlaylistEventBus,
} from '../../ports/playlist-event-bus';
import { DeleteTrackInput } from './delete-track.contracts';
import { throwIfCannotDeleteTracks } from 'src/playlist/domain/playlist-permissions';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotAVotePlaylist } from 'src/playlist/domain/errors/not-a-vote-playlist.error';
import { TrackNotFound } from 'src/playlist/domain/errors/track-not-found.error';
import { TrackAlreadyPlayed } from 'src/playlist/domain/errors/track-already-played.error';

@Injectable()
export class DeleteTrackUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: TrackRepository,
    @Inject(VOTE_REPOSITORY)
    private readonly voteRepository: VoteRepository,
    @Inject(PLAYLIST_EVENT_BUS)
    private readonly eventBus: PlaylistEventBus,
  ) {}

  async execute(input: DeleteTrackInput): Promise<void> {
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new PlaylistNotFound();
    }
    if (!playlist.isVotePlaylist()) {
      throw new NotAVotePlaylist();
    }

    // Owner and privileged participants only
    const participant =
      await this.participantRepository.findByPlaylistAndAccount({
        playlistId: playlist.id,
        accountId: input.accountId,
      });
    throwIfCannotDeleteTracks(
      playlist,
      input.accountId,
      participant,
      input.position,
    );

    const track = await this.trackRepository.findById(input.trackId);
    if (!track || track.playlistId !== playlist.id) {
      throw new TrackNotFound();
    }
    // A played track is part of the history, it is not in the ranking anymore
    if (track.isPlayed()) {
      throw new TrackAlreadyPlayed();
    }

    await this.voteRepository.deleteByTrack(track.id);
    await this.trackRepository.delete(track.id);

    this.eventBus.publish({
      type: 'track.removed',
      playlistId: playlist.id,
      trackId: track.id,
    });
  }
}
