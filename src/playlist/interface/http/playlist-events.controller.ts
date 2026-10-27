import { Controller, MessageEvent, Param, Sse } from '@nestjs/common';
import { interval, map, merge, Observable } from 'rxjs';
import { UserIdParam } from 'src/interface/http/decorators/user-param.decorator';
import { WatchPlaylistEventsUseCase } from 'src/playlist/application/use-cases/watch-playlist-events/watch-playlist-events.usecase';

// Keeps idle connections open through proxies and lets clients detect a dead stream
const HEARTBEAT_INTERVAL_MS = 25_000;

@Controller('playlists')
export class PlaylistEventsController {
  constructor(
    private readonly watchPlaylistEvents: WatchPlaylistEventsUseCase,
  ) {}

  // Access errors are thrown before the stream opens: they are plain JSON responses
  @Sse(':playlistId/events')
  async events(
    @UserIdParam() accountId: string,
    @Param('playlistId') playlistId: string,
  ): Promise<Observable<MessageEvent>> {
    const playlistEvents = await this.watchPlaylistEvents.execute({
      playlistId,
      accountId,
    });

    // Every message is a JSON object carrying its own "type"
    const eventMessages = playlistEvents.pipe(
      map((event): MessageEvent => ({ data: event })),
    );
    const heartbeatMessages = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map((): MessageEvent => ({ data: { type: 'heartbeat' } })),
    );

    return merge(eventMessages, heartbeatMessages);
  }
}
