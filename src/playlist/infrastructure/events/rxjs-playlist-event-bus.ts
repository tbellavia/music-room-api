import { Injectable, Logger } from '@nestjs/common';
import { filter, Observable, Subject } from 'rxjs';
import {
  PlaylistEvent,
  PlaylistEventBus,
} from 'src/playlist/application/ports/playlist-event-bus';

// In-process bus: only works with a single instance of the API.
// Several instances would need a shared relay (e.g. Redis pub/sub).
@Injectable()
export class RxjsPlaylistEventBus implements PlaylistEventBus {
  private readonly logger = new Logger(RxjsPlaylistEventBus.name);
  private readonly events = new Subject<PlaylistEvent>();

  publish(event: PlaylistEvent): void {
    this.logger.debug(
      `Event published type=${event.type} playlist=${event.playlistId}`,
    );
    this.events.next(event);
  }

  streamFor(playlistId: string): Observable<PlaylistEvent> {
    return this.events.pipe(filter((event) => event.playlistId === playlistId));
  }
}
