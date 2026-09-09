import { Injectable } from "@nestjs/common";
import { YoutubeClientPort } from "../application/ports/youtube-client.port";
import { Music } from "../domain/music.entity";
import YTMusic from "ytmusic-api";

@Injectable()
export class YoutubeApiClient implements YoutubeClientPort {
  async search(name: string): Promise<Music[]> {
    const api = new YTMusic();

    await api.initialize();
    const result = await api.search(name);
    const musics = result
      .filter(item => item.type == "SONG" || item.type == "VIDEO")
      .map(item => Music.create({
        name: item.name,
        videoId: item.videoId,
        artist: item.artist.name,
        thumbnail: (item.thumbnails.length === 0) ? null : item.thumbnails[0].url,
        duration: item.duration
      }));
    return musics;
  }
}
