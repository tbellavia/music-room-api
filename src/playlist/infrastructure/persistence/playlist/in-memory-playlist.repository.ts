import { PlaylistRepository } from 'src/playlist/application/ports/playlist.repository';
import { Playlist } from 'src/playlist/domain/playlist.entity';

// Test double for use-case specs: no database involved
export class InMemoryPlaylistRepository implements PlaylistRepository {
  public readonly playlists = new Map<string, Playlist>();

  findByOwnerAndName(infos: {
    ownerId: string;
    name: string;
  }): Promise<Playlist | null> {
    for (const playlist of this.playlists.values()) {
      if (playlist.ownerId === infos.ownerId && playlist.name === infos.name) {
        return Promise.resolve(playlist);
      }
    }
    return Promise.resolve(null);
  }

  findById(id: string): Promise<Playlist | null> {
    return Promise.resolve(this.playlists.get(id) ?? null);
  }

  save(playlist: Playlist): Promise<void> {
    this.playlists.set(playlist.id, playlist);
    return Promise.resolve();
  }
}
