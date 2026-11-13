import { playlistInfos } from 'src/playlist/domain/playlist-test-infos';
import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import {
  CreatePlaylistInfos,
  Playlist,
} from 'src/playlist/domain/playlist.entity';
import { Participant } from 'src/playlist/domain/participant.entity';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistStatus } from 'src/playlist/domain/playlist-status.enum';
import { Coordinates } from 'src/playlist/domain/geo';
import {
  ListPublicEventsUseCase,
  PUBLIC_EVENTS_LIMIT,
} from './list-public-events.usecase';

// One degree of latitude is ~111 195 meters
const ONE_METER_IN_LATITUDE_DEGREES = 1 / 111_195;

const ALICE_ID = 'alice-id';
const BOB_ID = 'bob-id';

const PARIS: Coordinates = { latitude: 48.8966, longitude: 2.3184 };
const ONE_DAY = 24 * 60 * 60 * 1000;

const defaultInfos: CreatePlaylistInfos = {
  id: 'playlist-id',
  type: PlaylistType.VOTE,
  ownerId: BOB_ID,
  name: 'Soirée',
  description: '',
  latitude: PARIS.latitude,
  longitude: PARIS.longitude,
  beginAt: new Date(Date.now() + ONE_DAY),
};

function inDays(days: number): Date {
  return new Date(Date.now() + days * ONE_DAY);
}

function metersNorthOfParis(meters: number): Coordinates {
  return {
    latitude: PARIS.latitude + meters * ONE_METER_IN_LATITUDE_DEGREES,
    longitude: PARIS.longitude,
  };
}

describe('ListPublicEventsUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let useCase: ListPublicEventsUseCase;

  async function givenEvent(overrides: Partial<CreatePlaylistInfos>) {
    const infos = playlistInfos(defaultInfos, {
      name: overrides.id,
      ...overrides,
    });
    await playlistRepository.save(Playlist.create(infos));
  }

  async function givenEventAt(id: string, meters: number) {
    const location = metersNorthOfParis(meters);
    await givenEvent({
      id,
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }

  async function listedIds(position: Coordinates | null): Promise<string[]> {
    const output = await useCase.execute({ accountId: ALICE_ID, position });
    return output.events.map((event) => event.id);
  }

  beforeEach(() => {
    playlistRepository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    useCase = new ListPublicEventsUseCase(
      playlistRepository,
      participantRepository,
    );
  });

  describe('which playlists are events', () => {
    it('returns the public playlists with a beginning date', async () => {
      await givenEvent({ id: 'event' });

      expect(await listedIds(null)).toEqual(['event']);
    });

    it('does not return a playlist without beginning date', async () => {
      await givenEvent({ id: 'no-date', beginAt: null });

      expect(await listedIds(null)).toEqual([]);
    });

    it('does not return a private playlist', async () => {
      await givenEvent({ id: 'private', isPrivate: true });

      expect(await listedIds(null)).toEqual([]);
    });

    it('does not return an ended playlist', async () => {
      await givenEvent({
        id: 'ended',
        beginAt: new Date('2000-01-01'),
        endAt: new Date('2000-01-02'),
      });

      expect(await listedIds(null)).toEqual([]);
    });

    it('returns a live playlist', async () => {
      await givenEvent({ id: 'live', beginAt: inDays(-1), endAt: inDays(1) });

      const output = await useCase.execute({
        accountId: ALICE_ID,
        position: null,
      });

      expect(output.events[0].status).toBe(PlaylistStatus.LIVE);
    });

    it('does not return the playlists of the account', async () => {
      await givenEvent({ id: 'owned', ownerId: ALICE_ID });

      expect(await listedIds(null)).toEqual([]);
    });

    it('does not return the playlists the account joined', async () => {
      await givenEvent({ id: 'joined' });
      const participant = Participant.create({
        id: 'participant-id',
        playlistId: 'joined',
        accountId: ALICE_ID,
        joinedVia: JoinMethod.JOIN,
      });
      await participantRepository.save(participant);

      expect(await listedIds(null)).toEqual([]);
    });
  });

  describe('without position', () => {
    it('returns the soonest first, live ones before upcoming ones', async () => {
      await givenEvent({ id: 'in-3-days', beginAt: inDays(3) });
      await givenEvent({ id: 'live', beginAt: inDays(-1) });
      await givenEvent({ id: 'in-1-day', beginAt: inDays(1) });

      expect(await listedIds(null)).toEqual(['live', 'in-1-day', 'in-3-days']);
    });

    it('returns editor events too', async () => {
      await givenEvent({ id: 'editor', type: PlaylistType.EDITOR });

      expect(await listedIds(null)).toEqual(['editor']);
    });

    it('gives no distance', async () => {
      await givenEvent({ id: 'event' });

      const output = await useCase.execute({
        accountId: ALICE_ID,
        position: null,
      });

      expect(output.events[0].distanceMeters).toBeNull();
    });

    it(`keeps only the ${PUBLIC_EVENTS_LIMIT} soonest`, async () => {
      for (let day = 1; day <= 12; day++) {
        await givenEvent({ id: `day-${day}`, beginAt: inDays(day) });
      }

      const ids = await listedIds(null);

      expect(ids).toHaveLength(PUBLIC_EVENTS_LIMIT);
      expect(ids[0]).toBe('day-1');
      expect(ids).not.toContain('day-11');
      expect(ids).not.toContain('day-12');
    });
  });

  describe('with a position', () => {
    it('returns the closest first, whatever the distance', async () => {
      await givenEventAt('far', 800_000);
      await givenEventAt('near', 300);
      await givenEventAt('middle', 5_000);

      const ids = await listedIds(PARIS);

      expect(ids).toEqual(['near', 'middle', 'far']);
    });

    it('does not return editor events, which have no location', async () => {
      await givenEvent({ id: 'editor', type: PlaylistType.EDITOR });

      expect(await listedIds(PARIS)).toEqual([]);
    });

    it('gives the distance rounded to the meter', async () => {
      await givenEventAt('event', 300);

      const output = await useCase.execute({
        accountId: ALICE_ID,
        position: PARIS,
      });

      expect(output.events[0].distanceMeters).toBe(300);
    });

    it(`keeps only the ${PUBLIC_EVENTS_LIMIT} closest`, async () => {
      for (let kilometers = 1; kilometers <= 12; kilometers++) {
        await givenEventAt(`km-${kilometers}`, kilometers * 1000);
      }

      const ids = await listedIds(PARIS);

      expect(ids).toHaveLength(PUBLIC_EVENTS_LIMIT);
      expect(ids[0]).toBe('km-1');
      expect(ids).not.toContain('km-12');
    });
  });

  describe('canJoinHere', () => {
    it('is true for a live event within 500 m', async () => {
      await givenEvent({ id: 'live', beginAt: inDays(-1) });

      const output = await useCase.execute({
        accountId: ALICE_ID,
        position: metersNorthOfParis(400),
      });

      expect(output.events[0].canJoinHere).toBe(true);
    });

    it('is false for a live event farther than 500 m', async () => {
      await givenEvent({ id: 'live', beginAt: inDays(-1) });

      const output = await useCase.execute({
        accountId: ALICE_ID,
        position: metersNorthOfParis(600),
      });

      expect(output.events[0].canJoinHere).toBe(false);
    });

    it('is false for an event that has not begun yet', async () => {
      await givenEvent({ id: 'upcoming', beginAt: inDays(1) });

      const output = await useCase.execute({
        accountId: ALICE_ID,
        position: PARIS,
      });

      expect(output.events[0].canJoinHere).toBe(false);
    });
  });
});
