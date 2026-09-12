import { Music } from "src/music/domain/music.entity";

export type PlaylistTrack = {
  userId: string;
  music: Music;
}

export class Playlist {
  constructor(
    public readonly id: string,
    public readonly owner_id: string,
    public readonly tracks: PlaylistTrack[]
  ) {}


  static create(infos: {
    id: string,
    owner_id: string
  }): Playlist {
    return new Playlist(infos.id, infos.owner_id, []);
  }

  push(userId: string, music: Music) {
    this.tracks.push({
      userId: userId,
      music: music
    });
  }
}
