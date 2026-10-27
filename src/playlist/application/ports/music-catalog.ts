import { MusicInfos } from 'src/playlist/domain/track.entity';

// Source of truth for the music informations: the client only sends a videoId
export interface MusicCatalog {
  findByVideoId(videoId: string): Promise<MusicInfos | null>;
}

export const MUSIC_CATALOG = Symbol('MusicCatalog');
