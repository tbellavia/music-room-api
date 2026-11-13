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

  findPublic(): Promise<Playlist[]> {
    const publicPlaylists: Playlist[] = [];
    for (const playlist of this.playlists.values()) {
      if (!playlist.isPrivate) {
        publicPlaylists.push(playlist);
      }
    }
    return Promise.resolve(publicPlaylists);
  }

  findByOwner(ownerId: string): Promise<Playlist[]> {
    const ownedPlaylists: Playlist[] = [];
    for (const playlist of this.playlists.values()) {
      if (playlist.isOwner(ownerId)) {
        ownedPlaylists.push(playlist);
      }
    }
    return Promise.resolve(ownedPlaylists);
  }

  findByIds(ids: string[]): Promise<Playlist[]> {
    const foundPlaylists: Playlist[] = [];
    for (const id of ids) {
      const playlist = this.playlists.get(id);
      if (playlist) {
        foundPlaylists.push(playlist);
      }
    }
    return Promise.resolve(foundPlaylists);
  }

  async findRecentByOwner(ownerId: string, limit: number): Promise<Playlist[]> {
    const ownedPlaylists = await this.findByOwner(ownerId);
    const mostRecentFirst = ownedPlaylists.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return mostRecentFirst.slice(0, limit);
  }

  findPublicEvents(now: Date): Promise<Playlist[]> {
    const events: Playlist[] = [];
    for (const playlist of this.playlists.values()) {
      const isEvent = !playlist.isPrivate && playlist.beginAt !== null;
      if (isEvent && !playlist.hasEnded(now)) {
        events.push(playlist);
      }
    }
    return Promise.resolve(events);
  }

  save(playlist: Playlist): Promise<void> {
    this.playlists.set(playlist.id, playlist);
    return Promise.resolve();
  }
}
