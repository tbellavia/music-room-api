import { MusicCatalog } from 'src/playlist/application/ports/music-catalog';
import { MusicInfos } from 'src/playlist/domain/track.entity';

// Test double for use-case specs: no call to YouTube
export class InMemoryMusicCatalog implements MusicCatalog {
  public readonly musics = new Map<string, MusicInfos>();

  add(music: MusicInfos): void {
    this.musics.set(music.videoId, music);
  }

  findByVideoId(videoId: string): Promise<MusicInfos | null> {
    return Promise.resolve(this.musics.get(videoId) ?? null);
  }
}
