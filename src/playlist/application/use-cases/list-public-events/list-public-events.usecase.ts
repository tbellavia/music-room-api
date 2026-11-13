import { Inject, Injectable } from '@nestjs/common';
import {
  PLAYLIST_REPOSITORY,
  PlaylistRepository,
} from '../../ports/playlist.repository';
import {
  PARTICIPANT_REPOSITORY,
  ParticipantRepository,
} from '../../ports/participant.repository';
import {
  ListPublicEventsInput,
  ListPublicEventsOutput,
  PublicEvent,
} from './list-public-events.contracts';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { Coordinates } from 'src/playlist/domain/geo';

export const PUBLIC_EVENTS_LIMIT = 10;

type LocatedEvent = {
  playlist: Playlist;
  distanceMeters: number;
};

@Injectable()
export class ListPublicEventsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
  ) {}

  async execute(input: ListPublicEventsInput): Promise<ListPublicEventsOutput> {
    const now = new Date();
    const events = await this.playlistRepository.findPublicEvents(now);
    const memberPlaylistIds = await this.findMemberPlaylistIds(input.accountId);

    // A discovery list: the playlists the account is already in are not news
    const newEvents = events.filter(
      (event) =>
        !event.isOwner(input.accountId) && !memberPlaylistIds.has(event.id),
    );

    if (input.position === null) {
      return { events: this.soonest(newEvents, now) };
    }
    return { events: this.closest(newEvents, input.position, now) };
  }

  private async findMemberPlaylistIds(accountId: string): Promise<Set<string>> {
    const participations =
      await this.participantRepository.findByAccount(accountId);

    return new Set(
      participations.map((participation) => participation.playlistId),
    );
  }

  // Live events come first, since they began before the upcoming ones
  private soonest(events: Playlist[], now: Date): PublicEvent[] {
    const soonestFirst = events.sort(
      (a, b) => this.beginningOf(a) - this.beginningOf(b),
    );

    return soonestFirst
      .slice(0, PUBLIC_EVENTS_LIMIT)
      .map((event) => this.toOutput(event, null, null, now));
  }

  // Only VOTE events have a location to be close to
  private closest(
    events: Playlist[],
    position: Coordinates,
    now: Date,
  ): PublicEvent[] {
    const locatedEvents: LocatedEvent[] = [];
    for (const playlist of events) {
      const distanceMeters = playlist.distanceFrom(position);
      if (distanceMeters !== null) {
        locatedEvents.push({ playlist, distanceMeters });
      }
    }

    const closestFirst = locatedEvents.sort(
      (a, b) => a.distanceMeters - b.distanceMeters,
    );

    return closestFirst
      .slice(0, PUBLIC_EVENTS_LIMIT)
      .map((event) =>
        this.toOutput(
          event.playlist,
          position,
          Math.round(event.distanceMeters),
          now,
        ),
      );
  }

  // The repository only returns events, which all have a beginning date
  private beginningOf(playlist: Playlist): number {
    if (playlist.beginAt === null) {
      return 0;
    }
    return playlist.beginAt.getTime();
  }

  private toOutput(
    playlist: Playlist,
    position: Coordinates | null,
    distanceMeters: number | null,
    now: Date,
  ): PublicEvent {
    return {
      id: playlist.id,
      type: playlist.type,
      license: playlist.license,
      ownerId: playlist.ownerId,
      name: playlist.name,
      description: playlist.description,
      beginAt: playlist.beginAt,
      endAt: playlist.endAt,
      latitude: playlist.latitude,
      longitude: playlist.longitude,
      coverPath: playlist.coverPath,
      status: playlist.status(now),
      distanceMeters,
      canJoinHere: playlist.canBeJoinedFrom(position, now),
    };
  }
}
