import { TrackRepository } from 'src/playlist/application/ports/track.repository';
import { Track } from 'src/playlist/domain/track.entity';
import { TrackVersionConflict } from 'src/playlist/domain/errors/track-version-conflict.error';

// Test double for use-case specs: no database involved.
// Stores and returns copies, like a database: modifying a loaded track does
// not change the stored one until it is saved (needed to test the versions).
export class InMemoryTrackRepository implements TrackRepository {
  public readonly tracks = new Map<string, Track>();

  findById(id: string): Promise<Track | null> {
    const storedTrack = this.tracks.get(id);
    if (!storedTrack) {
      return Promise.resolve(null);
    }
    return Promise.resolve(this.copy(storedTrack));
  }

  findUnplayedByPlaylist(playlistId: string): Promise<Track[]> {
    const unplayedTracks: Track[] = [];
    for (const track of this.tracks.values()) {
      if (track.playlistId === playlistId && !track.isPlayed()) {
        unplayedTracks.push(this.copy(track));
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
        return Promise.resolve(this.copy(track));
      }
    }
    return Promise.resolve(null);
  }

  async countUnplayedByPlaylist(playlistId: string): Promise<number> {
    const unplayedTracks = await this.findUnplayedByPlaylist(playlistId);
    return unplayedTracks.length;
  }

  save(track: Track): Promise<void> {
    this.tracks.set(track.id, this.copy(track));
    return Promise.resolve();
  }

  updatePosition(infos: {
    trackId: string;
    position: number;
    expectedVersion: number;
  }): Promise<void> {
    const storedTrack = this.tracks.get(infos.trackId);
    if (!storedTrack || storedTrack.version !== infos.expectedVersion) {
      return Promise.reject(new TrackVersionConflict());
    }
    storedTrack.position = infos.position;
    storedTrack.version = infos.expectedVersion + 1;
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.tracks.delete(id);
    return Promise.resolve();
  }

  private copy(track: Track): Track {
    return new Track(
      track.id,
      track.playlistId,
      track.videoId,
      track.name,
      track.artist,
      track.thumbnail,
      track.duration,
      track.addedBy,
      track.addedAt,
      track.playedAt,
      track.position,
      track.version,
    );
  }
}
