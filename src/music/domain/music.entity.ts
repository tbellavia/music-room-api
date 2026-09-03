export class Music {
  constructor(
    public readonly name: string,
    public readonly videoId: string,
    public readonly artist: string,
  ) {}


  static create(infos: {
    name: string,
    videoId: string,
    artist: string
  }): Music {
    return new Music(infos.name, infos.videoId, infos.artist);
  }
}
