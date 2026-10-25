import { CreatePlaylistInfos, Playlist } from './playlist.entity';
import { PlaylistType } from './playlist-type.enum';
import { Participant } from './participant.entity';
import {
  canInvite,
  canManageParticipants,
  isMember,
  throwIfParticipantCannotOperate,
} from './playlist-permissions';
import { PlaylistEnded } from './errors/playlist-ended.error';
import { PlaylistNotStarted } from './errors/playlist-not-started.error';
import { OutsidePlaylistZone } from './errors/outside-playlist-zone.error';

// One degree of latitude is ~111 195 meters
const ONE_METER_IN_LATITUDE_DEGREES = 1 / 111_195;

const PLAYLIST_LATITUDE = 48.8966;
const PLAYLIST_LONGITUDE = 2.3184;

const ON_SITE_POSITION = {
  latitude: PLAYLIST_LATITUDE + 400 * ONE_METER_IN_LATITUDE_DEGREES,
  longitude: PLAYLIST_LONGITUDE,
};
const FAR_POSITION = {
  latitude: PLAYLIST_LATITUDE + 600 * ONE_METER_IN_LATITUDE_DEGREES,
  longitude: PLAYLIST_LONGITUDE,
};

const defaultInfos: CreatePlaylistInfos = {
  id: 'playlist-id',
  type: PlaylistType.VOTE,
  ownerId: 'owner-id',
  name: 'Soirée',
  description: '',
  latitude: PLAYLIST_LATITUDE,
  longitude: PLAYLIST_LONGITUDE,
};

function buildPlaylist(overrides: Partial<CreatePlaylistInfos> = {}) {
  return Playlist.create({ ...defaultInfos, ...overrides });
}

function buildParticipant(hasPrivilege: boolean) {
  return new Participant(
    'participant-id',
    'playlist-id',
    'participant-account-id',
    hasPrivilege,
  );
}

describe('playlist permissions', () => {
  const playlist = buildPlaylist();

  describe('isMember', () => {
    it('is true for the owner', () => {
      expect(isMember(playlist, 'owner-id', null)).toBe(true);
    });

    it('is true for a participant', () => {
      const participant = buildParticipant(false);

      expect(isMember(playlist, 'participant-account-id', participant)).toBe(
        true,
      );
    });

    it('is false for someone else', () => {
      expect(isMember(playlist, 'stranger-id', null)).toBe(false);
    });
  });

  describe('canInvite', () => {
    it('lets the owner invite', () => {
      expect(canInvite(playlist, 'owner-id', null)).toBe(true);
    });

    it('lets a privileged participant invite', () => {
      const participant = buildParticipant(true);

      expect(canInvite(playlist, 'participant-account-id', participant)).toBe(
        true,
      );
    });

    it('does not let a regular participant invite', () => {
      const participant = buildParticipant(false);

      expect(canInvite(playlist, 'participant-account-id', participant)).toBe(
        false,
      );
    });

    it('does not let a non member invite', () => {
      expect(canInvite(playlist, 'stranger-id', null)).toBe(false);
    });
  });

  describe('canManageParticipants', () => {
    it('is reserved to the owner', () => {
      expect(canManageParticipants(playlist, 'owner-id')).toBe(true);
      expect(canManageParticipants(playlist, 'participant-account-id')).toBe(
        false,
      );
    });
  });

  describe('throwIfParticipantCannotOperate', () => {
    const now = new Date('2026-06-15T20:00:00Z');

    it('accepts a running playlist with a position on site', () => {
      const runningPlaylist = buildPlaylist({
        beginAt: new Date('2026-06-15T18:00:00Z'),
        endAt: new Date('2026-06-16T02:00:00Z'),
      });

      const check = () =>
        throwIfParticipantCannotOperate(runningPlaylist, ON_SITE_POSITION, now);

      expect(check).not.toThrow();
    });

    it('accepts a playlist without period', () => {
      const check = () =>
        throwIfParticipantCannotOperate(playlist, ON_SITE_POSITION, now);

      expect(check).not.toThrow();
    });

    it('rejects a playlist that has not started yet', () => {
      const futurePlaylist = buildPlaylist({
        beginAt: new Date('2026-06-15T22:00:00Z'),
      });

      const check = () =>
        throwIfParticipantCannotOperate(futurePlaylist, ON_SITE_POSITION, now);

      expect(check).toThrow(PlaylistNotStarted);
    });

    it('rejects a playlist that has ended', () => {
      const endedPlaylist = buildPlaylist({
        endAt: new Date('2026-06-15T19:00:00Z'),
      });

      const check = () =>
        throwIfParticipantCannotOperate(endedPlaylist, ON_SITE_POSITION, now);

      expect(check).toThrow(PlaylistEnded);
    });

    it('rejects a position outside the zone', () => {
      const check = () =>
        throwIfParticipantCannotOperate(playlist, FAR_POSITION, now);

      expect(check).toThrow(OutsidePlaylistZone);
    });

    it('rejects a missing position', () => {
      const check = () => throwIfParticipantCannotOperate(playlist, null, now);

      expect(check).toThrow(OutsidePlaylistZone);
    });
  });
});
