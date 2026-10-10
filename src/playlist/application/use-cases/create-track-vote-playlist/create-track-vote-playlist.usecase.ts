import { Inject, Injectable } from '@nestjs/common';
import {
  TRACK_VOTE_PLAYLIST_REPOSITORY,
  TrackVotePlaylistRepository,
} from '../../ports/track-vote-playlist.repository';
import {
  CreateTrackVotePlaylistInput,
  CreateTrackVotePlaylistOutput,
} from './create-track-vote-playlist.contracts';

@Injectable()
export class CreateTrackvotePlaylistUseCase {
  constructor(
    @Inject(TRACK_VOTE_PLAYLIST_REPOSITORY)
    private readonly trackVoteRepository: TrackVotePlaylistRepository,
  ) {}

  async execute(
    input: CreateTrackVotePlaylistInput,
  ): Promise<CreateTrackVotePlaylistOutput> {
    const playlist =
      await this.trackVoteRepository.findByCreatorAndPlaylistName({
        creatorId: input.creatorId,
        playlistName: input.name,
      });

    if (playlist) {
      throw new PlaylistAlreadyExists();
    }
  }
}
