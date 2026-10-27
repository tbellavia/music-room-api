import { Injectable } from '@nestjs/common';
import YTMusic from 'ytmusic-api';
import { MusicCatalog } from 'src/playlist/application/ports/music-catalog';
import { MusicInfos } from 'src/playlist/domain/track.entity';

// Message thrown by ytmusic-api when YouTube does not know the videoId
const UNKNOWN_VIDEO_MESSAGE = 'Invalid videoId';

@Injectable()
export class YtMusicCatalog implements MusicCatalog {
  async findByVideoId(videoId: string): Promise<MusicInfos | null> {
    const api = new YTMusic();
    await api.initialize();

    try {
      // getSong also works for plain videos
      const song = await api.getSong(videoId);
      return {
        videoId: song.videoId,
        name: song.name,
        artist: song.artist.name,
        thumbnail: song.thumbnails.length === 0 ? null : song.thumbnails[0].url,
        duration: song.duration,
      };
    } catch (error) {
      if (error instanceof Error && error.message === UNKNOWN_VIDEO_MESSAGE) {
        return null;
      }
      throw error;
    }
  }
}
