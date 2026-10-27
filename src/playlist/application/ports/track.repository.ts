import { Track } from 'src/playlist/domain/track.entity';

export interface TrackRepository {
  findById(id: string): Promise<Track | null>;
  // EDITOR tracks are never played: this returns all of them
  findUnplayedByPlaylist(playlistId: string): Promise<Track[]>;
  findUnplayedByPlaylistAndVideo(infos: {
    playlistId: string;
    videoId: string;
  }): Promise<Track | null>;
  countUnplayedByPlaylist(playlistId: string): Promise<number>;
  save(track: Track): Promise<void>;
  // Writes only if the stored version is still `expectedVersion`, then bumps it.
  // Must fail with TrackVersionConflict otherwise.
  updatePosition(infos: {
    trackId: string;
    position: number;
    expectedVersion: number;
  }): Promise<void>;
  delete(id: string): Promise<void>;
}

export const TRACK_REPOSITORY = Symbol('TrackRepository');
