import { InvalidPlaylistPeriod } from './errors/invalid-playlist-period.error';
import { PlaylistType } from './playlist-type.enum';
import { CreatePlaylistInfos, Playlist } from './playlist.entity';

// One degree of latitude is ~111 195 meters
const ONE_METER_IN_LATITUDE_DEGREES = 1 / 111_195;

const defaultInfos: CreatePlaylistInfos = {
  id: 'playlist-id',
  type: PlaylistType.VOTE,
  ownerId: 'owner-id',
  name: 'Soirée',
  description: '',
  latitude: 48.8966,
  longitude: 2.3184,
};

function build(overrides: Partial<CreatePlaylistInfos> = {}): Playlist {
  return Playlist.create({ ...defaultInfos, ...overrides });
}

describe('Playlist', () => {
  describe('create', () => {
    it('is public and has no period by default', () => {
      const playlist = build();

      expect(playlist.isPrivate).toBe(false);
      expect(playlist.beginAt).toBeNull();
      expect(playlist.endAt).toBeNull();
      expect(playlist.coverPath).toBeNull();
    });

    it('accepts an end date without begin date', () => {
      expect(() => build({ endAt: new Date('2026-12-31') })).not.toThrow();
    });

    it('rejects an end date before the begin date', () => {
      expect(() =>
        build({
          beginAt: new Date('2026-12-31T18:00:00Z'),
          endAt: new Date('2026-12-31T16:00:00Z'),
        }),
      ).toThrow(InvalidPlaylistPeriod);
    });

    it('rejects an end date equal to the begin date', () => {
      const date = new Date('2026-12-31T18:00:00Z');

      expect(() => build({ beginAt: date, endAt: date })).toThrow(
        InvalidPlaylistPeriod,
      );
    });
  });

  describe('isOwner', () => {
    it('is true only for the owner', () => {
      const playlist = build();

      expect(playlist.isOwner('owner-id')).toBe(true);
      expect(playlist.isOwner('someone-else')).toBe(false);
    });
  });

  describe('hasEnded', () => {
    const endAt = new Date('2026-12-31T18:00:00Z');

    it('never ends without end date', () => {
      const playlist = build();

      expect(playlist.hasEnded(new Date('2999-01-01'))).toBe(false);
    });

    it('has not ended before the end date', () => {
      const playlist = build({ endAt });

      expect(playlist.hasEnded(new Date('2026-12-31T17:59:59Z'))).toBe(false);
    });

    it('has ended from the end date', () => {
      const playlist = build({ endAt });

      expect(playlist.hasEnded(endAt)).toBe(true);
    });
  });

  describe('isActive', () => {
    const beginAt = new Date('2026-12-31T16:00:00Z');
    const endAt = new Date('2026-12-31T18:00:00Z');

    it('is always active without period', () => {
      expect(build().isActive(new Date('2000-01-01'))).toBe(true);
    });

    it('is inactive before the beginning', () => {
      const playlist = build({ beginAt, endAt });

      expect(playlist.isActive(new Date('2026-12-31T15:59:59Z'))).toBe(false);
    });

    it('is active during the period', () => {
      const playlist = build({ beginAt, endAt });

      expect(playlist.isActive(beginAt)).toBe(true);
      expect(playlist.isActive(new Date('2026-12-31T17:00:00Z'))).toBe(true);
    });

    it('is inactive once ended', () => {
      const playlist = build({ beginAt, endAt });

      expect(playlist.isActive(endAt)).toBe(false);
    });
  });

  describe('isWithinZone', () => {
    const playlist = build({ latitude: 48.8966, longitude: 2.3184 });

    it('accepts a position at 400 m', () => {
      expect(
        playlist.isWithinZone({
          latitude: 48.8966 + 400 * ONE_METER_IN_LATITUDE_DEGREES,
          longitude: 2.3184,
        }),
      ).toBe(true);
    });

    it('accepts a position right under the 500 m limit', () => {
      expect(
        playlist.isWithinZone({
          latitude: 48.8966 + 499 * ONE_METER_IN_LATITUDE_DEGREES,
          longitude: 2.3184,
        }),
      ).toBe(true);
    });

    it('rejects a position at 600 m', () => {
      expect(
        playlist.isWithinZone({
          latitude: 48.8966 - 600 * ONE_METER_IN_LATITUDE_DEGREES,
          longitude: 2.3184,
        }),
      ).toBe(false);
    });
  });
});
