import { TrackVotePlaylist } from "src/playlist/domain/track-vote-playlist.entity";

export interface TrackVotePlaylistRepository {
  findByCreatorAndPlaylistName(infos: {
    creatorId: string;
    playlistName: string;
  }): Promise<TrackVotePlaylist | null>;
  find(id: string): Promise<TrackVotePlaylist>;
  save(playlist: TrackVotePlaylist): Promise<void>;
}

export const TRACK_VOTE_PLAYLIST_REPOSITORY = Symbol(
  'TrackVotePlaylistRepository',
);
