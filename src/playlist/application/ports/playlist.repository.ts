import { Playlist } from "src/playlist/domain/playlist.entity";

export interface PlaylistRepository {
  find(id: string): Promise<Playlist>;
  save(playlist: Playlist): Promise<void>;
}

export const PLAYLIST_REPOSITORY = Symbol('PlaylistRepository');
