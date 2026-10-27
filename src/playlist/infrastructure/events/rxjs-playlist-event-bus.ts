import { Injectable } from '@nestjs/common';
import { filter, Observable, Subject } from 'rxjs';
import {
  PlaylistEvent,
  PlaylistEventBus,
} from 'src/playlist/application/ports/playlist-event-bus';

// In-process bus: only works with a single instance of the API.
// Several instances would need a shared relay (e.g. Redis pub/sub).
@Injectable()
export class RxjsPlaylistEventBus implements PlaylistEventBus {
  private readonly events = new Subject<PlaylistEvent>();

  publish(event: PlaylistEvent): void {
    this.events.next(event);
  }

  streamFor(playlistId: string): Observable<PlaylistEvent> {
    return this.events.pipe(filter((event) => event.playlistId === playlistId));
  }
}
