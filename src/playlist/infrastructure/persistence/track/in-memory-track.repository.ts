import { TrackRepository } from 'src/playlist/application/ports/track.repository';
import { Track } from 'src/playlist/domain/track.entity';

// Test double for use-case specs: no database involved
export class InMemoryTrackRepository implements TrackRepository {
  public readonly tracks = new Map<string, Track>();

  findById(id: string): Promise<Track | null> {
    return Promise.resolve(this.tracks.get(id) ?? null);
  }

  findUnplayedByPlaylist(playlistId: string): Promise<Track[]> {
    const unplayedTracks: Track[] = [];
    for (const track of this.tracks.values()) {
      if (track.playlistId === playlistId && !track.isPlayed()) {
        unplayedTracks.push(track);
      }
    }
    return Promise.resolve(unplayedTracks);
  }

  findUnplayedByPlaylistAndVideo(infos: {
    playlistId: string;
    videoId: string;
  }): Promise<Track | null> {
    for (const track of this.tracks.values()) {
      const isSamePlaylist = track.playlistId === infos.playlistId;
      const isSameVideo = track.videoId === infos.videoId;
      if (isSamePlaylist && isSameVideo && !track.isPlayed()) {
        return Promise.resolve(track);
      }
    }
    return Promise.resolve(null);
  }

  save(track: Track): Promise<void> {
    this.tracks.set(track.id, track);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.tracks.delete(id);
    return Promise.resolve();
  }
}
