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
import { toTrackView } from '../../track-view';
import {
  ListTracksInput,
  ListTracksOutput,
  RankedTrackView,
} from './list-tracks.contracts';
import { rankTracks } from 'src/playlist/domain/track-ranking';
import { canRead } from 'src/playlist/domain/playlist-permissions';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotAVotePlaylist } from 'src/playlist/domain/errors/not-a-vote-playlist.error';
import { NotPlaylistMember } from 'src/playlist/domain/errors/not-playlist-member.error';

@Injectable()
export class ListTracksUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: TrackRepository,
    @Inject(VOTE_REPOSITORY)
    private readonly voteRepository: VoteRepository,
  ) {}

  async execute(input: ListTracksInput): Promise<ListTracksOutput> {
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
    if (!canRead(playlist, input.accountId, participant)) {
      throw new NotPlaylistMember();
    }

    const tracks = await this.trackRepository.findUnplayedByPlaylist(
      playlist.id,
    );
    const trackIds = tracks.map((track) => track.id);
    const votes = await this.voteRepository.findByTracks(trackIds);

    const votedTrackIds = new Set<string>();
    for (const vote of votes) {
      if (vote.accountId === input.accountId) {
        votedTrackIds.add(vote.trackId);
      }
    }

    const rankedTracks = rankTracks(tracks, votes);
    const trackViews: RankedTrackView[] = rankedTracks.map((rankedTrack) => ({
      ...toTrackView(rankedTrack.track, rankedTrack.votes),
      hasVoted: votedTrackIds.has(rankedTrack.track.id),
    }));

    return {
      tracks: trackViews,
    };
  }
}
