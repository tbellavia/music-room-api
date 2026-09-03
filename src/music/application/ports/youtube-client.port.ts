import { Music } from "src/music/domain/music.entity";

export interface YoutubeClientPort {
  search(name: string): Promise<Music[]>;
}

export const YOUTUBE_CLIENT_PORT = Symbol("YoutubeClientPort");
