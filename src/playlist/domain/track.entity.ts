import { TrackAlreadyPlayed } from './errors/track-already-played.error';
import { TrackVersionConflict } from './errors/track-version-conflict.error';

export type MusicInfos = {
  videoId: string;
  name: string;
  artist: string;
  thumbnail: string | null;
  duration: number | null;
};

const FIRST_VERSION = 1;

export class Track {
  constructor(
    public readonly id: string,
    public readonly playlistId: string,
    public readonly videoId: string,
    public readonly name: string,
    public readonly artist: string,
    public readonly thumbnail: string | null,
    public readonly duration: number | null,
    public readonly addedBy: string,
    public readonly addedAt: Date,
    public playedAt: Date | null,
    // Order in an EDITOR playlist (null in a VOTE playlist, ranked by votes)
    public position: number | null,
    // Incremented on every move: protects against concurrent moves of this track
    public version: number,
  ) {}

  static create(infos: {
    id: string;
    playlistId: string;
    music: MusicInfos;
    addedBy: string;
    addedAt: Date;
    position?: number | null;
  }): Track {
    return new Track(
      infos.id,
      infos.playlistId,
      infos.music.videoId,
      infos.music.name,
      infos.music.artist,
      infos.music.thumbnail,
      infos.music.duration,
      infos.addedBy,
      infos.addedAt,
      null,
      infos.position ?? null,
      FIRST_VERSION,
    );
  }

  isPlayed(): boolean {
    return this.playedAt !== null;
  }

  isAddedBy(accountId: string): boolean {
    return this.addedBy === accountId;
  }

  markAsPlayed(now: Date = new Date()): void {
    if (this.isPlayed()) {
      throw new TrackAlreadyPlayed();
    }
    this.playedAt = now;
  }

  // The caller states which version it based its decision on: if the track
  // moved in the meantime, the move is refused instead of overwriting the other
  moveTo(position: number, expectedVersion: number): void {
    if (this.version !== expectedVersion) {
      throw new TrackVersionConflict();
    }
    this.position = position;
    this.version = this.version + 1;
  }

  // Renumbering keeps the order: it is not a move, the version does not change
  renumberTo(position: number): void {
    this.position = position;
  }
}
