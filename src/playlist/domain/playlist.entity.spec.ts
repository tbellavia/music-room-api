import { InvalidPlaylistPeriod } from './errors/invalid-playlist-period.error';
import { LocationNotAllowed } from './errors/location-not-allowed.error';
import { LocationRequired } from './errors/location-required.error';
import { PlaylistType } from './playlist-type.enum';
import { PlaylistStatus } from './playlist-status.enum';
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

    it('records when it was created', () => {
      const before = new Date();

      const playlist = build();

      expect(playlist.createdAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });

    it('keeps the location of a vote playlist', () => {
      const playlist = build();

      expect(playlist.latitude).toBe(48.8966);
      expect(playlist.longitude).toBe(2.3184);
    });

    it('rejects a vote playlist without location', () => {
      expect(() => build({ latitude: null, longitude: null })).toThrow(
        LocationRequired,
      );
    });

    it('rejects a vote playlist with only one coordinate', () => {
      expect(() => build({ longitude: undefined })).toThrow(LocationRequired);
    });

    it('creates an editor playlist without location', () => {
      const playlist = build({
        type: PlaylistType.EDITOR,
        latitude: undefined,
        longitude: undefined,
      });

      expect(playlist.latitude).toBeNull();
      expect(playlist.longitude).toBeNull();
    });

    it('rejects an editor playlist with a location', () => {
      expect(() => build({ type: PlaylistType.EDITOR })).toThrow(
        LocationNotAllowed,
      );
    });

    it('rejects an editor playlist with only one coordinate', () => {
      expect(() =>
        build({ type: PlaylistType.EDITOR, latitude: undefined }),
      ).toThrow(LocationNotAllowed);
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

    it('is false for an editor playlist, which has no zone', () => {
      const editorPlaylist = build({
        type: PlaylistType.EDITOR,
        latitude: null,
        longitude: null,
      });

      expect(
        editorPlaylist.isWithinZone({ latitude: 48.8966, longitude: 2.3184 }),
      ).toBe(false);
    });
  });

  describe('status', () => {
    const beginAt = new Date('2030-01-01T20:00:00Z');
    const endAt = new Date('2030-01-02T04:00:00Z');
    const playlist = build({ beginAt, endAt });

    it('is upcoming before the beginning', () => {
      const beforeBeginning = new Date('2030-01-01T19:00:00Z');

      expect(playlist.status(beforeBeginning)).toBe(PlaylistStatus.UPCOMING);
    });

    it('is live from the beginning', () => {
      expect(playlist.status(beginAt)).toBe(PlaylistStatus.LIVE);
    });

    it('is ended from the end', () => {
      expect(playlist.status(endAt)).toBe(PlaylistStatus.ENDED);
    });

    it('is live when there is no period', () => {
      const playlistWithoutPeriod = build();

      expect(playlistWithoutPeriod.status()).toBe(PlaylistStatus.LIVE);
    });
  });

  describe('distanceFrom', () => {
    it('is the distance in meters to the location', () => {
      const playlist = build({ latitude: 48.8966, longitude: 2.3184 });

      const distance = playlist.distanceFrom({
        latitude: 48.8966 + 400 * ONE_METER_IN_LATITUDE_DEGREES,
        longitude: 2.3184,
      });

      expect(distance).toBeCloseTo(400, 0);
    });

    it('is null for an editor playlist, which has no location', () => {
      const editorPlaylist = build({
        type: PlaylistType.EDITOR,
        latitude: null,
        longitude: null,
      });

      expect(
        editorPlaylist.distanceFrom({ latitude: 48.8966, longitude: 2.3184 }),
      ).toBeNull();
    });
  });

  describe('canBeJoinedFrom', () => {
    const inZone = {
      latitude: 48.8966 + 400 * ONE_METER_IN_LATITUDE_DEGREES,
      longitude: 2.3184,
    };
    const outsideZone = {
      latitude: 48.8966 + 600 * ONE_METER_IN_LATITUDE_DEGREES,
      longitude: 2.3184,
    };

    it('is true for a live vote playlist from inside the zone', () => {
      expect(build().canBeJoinedFrom(inZone)).toBe(true);
    });

    it('is false for a vote playlist from outside the zone', () => {
      expect(build().canBeJoinedFrom(outsideZone)).toBe(false);
    });

    it('is false for a vote playlist without position', () => {
      expect(build().canBeJoinedFrom(null)).toBe(false);
    });

    it('is true for a live editor playlist, from anywhere', () => {
      const editorPlaylist = build({
        type: PlaylistType.EDITOR,
        latitude: null,
        longitude: null,
      });

      expect(editorPlaylist.canBeJoinedFrom(null)).toBe(true);
    });

    it('is false for a playlist that has not begun yet', () => {
      const upcomingPlaylist = build({ beginAt: new Date('2999-01-01') });

      expect(upcomingPlaylist.canBeJoinedFrom(inZone)).toBe(false);
    });

    it('is false for a private playlist', () => {
      const privatePlaylist = build({ isPrivate: true });

      expect(privatePlaylist.canBeJoinedFrom(inZone)).toBe(false);
    });
  });
});
