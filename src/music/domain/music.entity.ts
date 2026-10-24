export class Music {
  constructor(
    public readonly name: string,
    public readonly videoId: string,
    public readonly artist: string,
    public readonly thumbnail: string | null,
    public readonly duration: number | null,
  ) {}

  static create(infos: {
    name: string;
    videoId: string;
    artist: string;
    thumbnail: string | null;
    duration: number | null;
  }): Music {
    return new Music(
      infos.name,
      infos.videoId,
      infos.artist,
      infos.thumbnail,
      infos.duration,
    );
  }
}
