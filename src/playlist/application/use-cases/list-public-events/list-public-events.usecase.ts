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
} from './list-public-events.contracts';
import {
  ACCOUNT_DIRECTORY,
  AccountDirectory,
} from '../../ports/account-directory';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { Coordinates } from 'src/playlist/domain/geo';
import {
  findOwnerUsernames,
  toListedPlaylist,
} from 'src/playlist/application/listed-playlist';

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
    // Only for the listed events: one lookup for at most 10 owners
    const usernameById = await findOwnerUsernames(
      this.accountDirectory,
      listedEvents,
    );
    const context = { usernameById, position: input.position, now };

    // The members were filtered out above
    return {
      playlists: listedEvents.map((playlist) =>
        toListedPlaylist({ playlist, membership: null }, context),
      ),
    };
  }

  private listed(events: Playlist[], position: Coordinates | null): Playlist[] {
    if (position === null) {
      return this.soonest(events);
    }
    return this.closest(events, position);
  }

  private async findMemberPlaylistIds(accountId: string): Promise<Set<string>> {
    const participations =
      await this.participantRepository.findByAccount(accountId);

    return new Set(
      participations.map((participation) => participation.playlistId),
    );
  }

  // Live events come first, since they began before the upcoming ones
  private soonest(events: Playlist[]): Playlist[] {
    const soonestFirst = events.sort(
      (a, b) => this.beginningOf(a) - this.beginningOf(b),
    );

    return soonestFirst.slice(0, PUBLIC_EVENTS_LIMIT);
  }

  // Only VOTE events have a location to be close to
  private closest(events: Playlist[], position: Coordinates): Playlist[] {
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
      .map((locatedEvent) => locatedEvent.playlist);
  }

  // The repository only returns events, which all have a beginning date
  private beginningOf(playlist: Playlist): number {
    if (playlist.beginAt === null) {
      return 0;
    }
    return playlist.beginAt.getTime();
  }
}
