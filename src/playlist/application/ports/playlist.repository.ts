import { Playlist } from 'src/playlist/domain/playlist.entity';

export interface PlaylistRepository {
  findByOwnerAndName(infos: {
    ownerId: string;
    name: string;
  }): Promise<Playlist | null>;
  findById(id: string): Promise<Playlist | null>;
  findPublic(): Promise<Playlist[]>;
  findByOwner(ownerId: string): Promise<Playlist[]>;
  findByIds(ids: string[]): Promise<Playlist[]>;
  // Most recent first
  findRecentByOwner(ownerId: string, limit: number): Promise<Playlist[]>;
  // Public playlists with a beginning date that have not ended at `now`
  findPublicEvents(now: Date): Promise<Playlist[]>;
  save(playlist: Playlist): Promise<void>;
}

export const PLAYLIST_REPOSITORY = Symbol('PlaylistRepository');
