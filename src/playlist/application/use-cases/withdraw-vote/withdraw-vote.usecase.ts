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
import {
  WithdrawVoteInput,
  WithdrawVoteOutput,
} from './withdraw-vote.contracts';
import { throwIfCannotActOnTracks } from 'src/playlist/domain/playlist-permissions';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotAVotePlaylist } from 'src/playlist/domain/errors/not-a-vote-playlist.error';
import { TrackNotFound } from 'src/playlist/domain/errors/track-not-found.error';
import { TrackAlreadyPlayed } from 'src/playlist/domain/errors/track-already-played.error';
import { VoteNotFound } from 'src/playlist/domain/errors/vote-not-found.error';

@Injectable()
export class WithdrawVoteUseCase {
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

  async execute(input: WithdrawVoteInput): Promise<WithdrawVoteOutput> {
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new PlaylistNotFound();
    }
    if (!playlist.isVotePlaylist()) {
      throw new NotAVotePlaylist();
    }

    const participant =
      await this.participantRepository.findByPlaylistAndAccount({
        playlistId: playlist.id,
        accountId: input.accountId,
      });
    throwIfCannotActOnTracks(
      playlist,
      input.accountId,
      participant,
      input.position,
    );

    const track = await this.trackRepository.findById(input.trackId);
    if (!track || track.playlistId !== playlist.id) {
      throw new TrackNotFound();
    }
    if (track.isPlayed()) {
      throw new TrackAlreadyPlayed();
    }

    const vote = await this.voteRepository.findByTrackAndAccount({
      trackId: track.id,
      accountId: input.accountId,
    });
    if (!vote) {
      throw new VoteNotFound();
    }
    await this.voteRepository.delete({
      trackId: track.id,
      accountId: input.accountId,
    });

    const votes = await this.voteRepository.countByTrack(track.id);
    this.eventBus.publish({
      type: 'track.votes_changed',
      playlistId: playlist.id,
      trackId: track.id,
      votes,
    });

    return {
      votes,
    };
  }
}
