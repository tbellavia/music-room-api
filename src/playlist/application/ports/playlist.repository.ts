import { Playlist } from 'src/playlist/domain/playlist.entity';

export interface PlaylistRepository {
  findByOwnerAndName(infos: {
    ownerId: string;
    name: string;
  }): Promise<Playlist | null>;
  findById(id: string): Promise<Playlist | null>;
  findPublic(): Promise<Playlist[]>;
  save(playlist: Playlist): Promise<void>;
}

export const PLAYLIST_REPOSITORY = Symbol('PlaylistRepository');
