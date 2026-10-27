import { Track } from 'src/playlist/domain/track.entity';

export interface TrackRepository {
  findById(id: string): Promise<Track | null>;
  findUnplayedByPlaylist(playlistId: string): Promise<Track[]>;
  findUnplayedByPlaylistAndVideo(infos: {
    playlistId: string;
    videoId: string;
  }): Promise<Track | null>;
  save(track: Track): Promise<void>;
  delete(id: string): Promise<void>;
}

export const TRACK_REPOSITORY = Symbol('TrackRepository');
