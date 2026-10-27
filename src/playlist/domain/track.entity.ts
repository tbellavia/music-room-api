import { TrackAlreadyPlayed } from './errors/track-already-played.error';

export type MusicInfos = {
  videoId: string;
  name: string;
  artist: string;
  thumbnail: string | null;
  duration: number | null;
};

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
  ) {}

  static create(infos: {
    id: string;
    playlistId: string;
    music: MusicInfos;
    addedBy: string;
    addedAt: Date;
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
}
