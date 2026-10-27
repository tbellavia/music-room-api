import { Injectable } from '@nestjs/common';
import { PlaylistEditLock } from 'src/playlist/application/ports/playlist-edit-lock';

// One queue of promises per playlist: each edit starts when the previous one
// is over. In-process, like the event bus: only valid with a single instance
// of the API (several instances would need a lock shared through the database).
@Injectable()
export class InProcessPlaylistEditLock implements PlaylistEditLock {
  // Last edit queued for each playlist
  private readonly queueTails = new Map<string, Promise<void>>();

  runExclusively<T>(playlistId: string, work: () => Promise<T>): Promise<T> {
    const previousTail = this.queueTails.get(playlistId) ?? Promise.resolve();
    const result = previousTail.then(() => work());

    // The next edit waits for this one, whether it succeeds or fails
    const newTail = result.then(
      () => undefined,
      () => undefined,
    );
    this.queueTails.set(playlistId, newTail);

    // Forget the queue once it is empty, so the map does not grow forever
    void newTail.then(() => {
      if (this.queueTails.get(playlistId) === newTail) {
        this.queueTails.delete(playlistId);
      }
    });

    return result;
  }
}
