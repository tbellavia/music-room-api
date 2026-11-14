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
import {
  ACCOUNT_DIRECTORY,
  AccountDirectory,
} from '../../ports/account-directory';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { Coordinates } from 'src/playlist/domain/geo';

export const PUBLIC_EVENTS_LIMIT = 10;

type LocatedEvent = {
  playlist: Playlist;
  distanceMeters: number;
};

// null without position
type ListedEvent = {
  playlist: Playlist;
  distanceMeters: number | null;
};

@Injectable()
export class ListPublicEventsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
    @Inject(ACCOUNT_DIRECTORY)
    private readonly accountDirectory: AccountDirectory,
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

    const listedEvents = this.listed(newEvents, input.position);
    const usernameById = await this.findOwnerUsernames(listedEvents);

    return {
      events: listedEvents.map((event) =>
        this.toOutput(event, input.position, usernameById, now),
      ),
    };
  }

  private listed(
    events: Playlist[],
    position: Coordinates | null,
  ): ListedEvent[] {
    if (position === null) {
      return this.soonest(events);
    }
    return this.closest(events, position);
  }

  // Only for the listed events: one lookup for at most 10 owners
  private async findOwnerUsernames(
    events: ListedEvent[],
  ): Promise<Map<string, string>> {
    const ownerIds = events.map((event) => event.playlist.ownerId);
    const owners = await this.accountDirectory.findByIds(ownerIds);
    const usernameById = new Map<string, string>();
    for (const owner of owners) {
      usernameById.set(owner.id, owner.username);
    }
    return usernameById;
  }

  private async findMemberPlaylistIds(accountId: string): Promise<Set<string>> {
    const participations =
      await this.participantRepository.findByAccount(accountId);

    return new Set(
      participations.map((participation) => participation.playlistId),
    );
  }

  // Live events come first, since they began before the upcoming ones
  private soonest(events: Playlist[]): ListedEvent[] {
    const soonestFirst = events.sort(
      (a, b) => this.beginningOf(a) - this.beginningOf(b),
    );

    return soonestFirst
      .slice(0, PUBLIC_EVENTS_LIMIT)
      .map((playlist) => ({ playlist, distanceMeters: null }));
  }

  // Only VOTE events have a location to be close to
  private closest(events: Playlist[], position: Coordinates): ListedEvent[] {
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

    return closestFirst.slice(0, PUBLIC_EVENTS_LIMIT);
  }

  // The repository only returns events, which all have a beginning date
  private beginningOf(playlist: Playlist): number {
    if (playlist.beginAt === null) {
      return 0;
    }
    return playlist.beginAt.getTime();
  }

  private toOutput(
    event: ListedEvent,
    position: Coordinates | null,
    usernameById: Map<string, string>,
    now: Date,
  ): PublicEvent {
    const playlist = event.playlist;
    let distanceMeters: number | null = null;
    if (event.distanceMeters !== null) {
      distanceMeters = Math.round(event.distanceMeters);
    }

    return {
      id: playlist.id,
      type: playlist.type,
      license: playlist.license,
      ownerId: playlist.ownerId,
      ownerUsername: usernameById.get(playlist.ownerId) ?? null,
      name: playlist.name,
      description: playlist.description,
      beginAt: playlist.beginAt,
      endAt: playlist.endAt,
      latitude: playlist.latitude,
      longitude: playlist.longitude,
      address: playlist.address,
      coverPath: playlist.coverPath,
      status: playlist.status(now),
      distanceMeters,
      canJoinHere: playlist.canBeJoinedFrom(position, now),
    };
  }
}
