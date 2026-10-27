import { CreatePlaylistInfos, Playlist } from './playlist.entity';
import { JoinMethod } from './join-method.enum';
import { PlaylistType } from './playlist-type.enum';
import { Participant } from './participant.entity';
import { PlaylistLicense } from './playlist-license.enum';
import {
  canActOnTracks,
  canDeleteTracks,
  canInvite,
  canManageParticipants,
  canRead,
  isMember,
  throwIfCannotActOnTracks,
  throwIfCannotDeleteTracks,
  throwIfParticipantCannotOperate,
} from './playlist-permissions';
import { PlaylistEnded } from './errors/playlist-ended.error';
import { PlaylistNotStarted } from './errors/playlist-not-started.error';
import { OutsidePlaylistZone } from './errors/outside-playlist-zone.error';
import { NotPlaylistMember } from './errors/not-playlist-member.error';
import { TrackActionForbidden } from './errors/track-action-forbidden.error';
import { TrackDeleteForbidden } from './errors/track-delete-forbidden.error';

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

function buildParticipant(
  hasPrivilege: boolean,
  joinedVia: JoinMethod = JoinMethod.JOIN,
) {
  return new Participant(
    'participant-id',
    'playlist-id',
    'participant-account-id',
    hasPrivilege,
    joinedVia,
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

  describe('canRead', () => {
    it('lets anyone read a public playlist', () => {
      expect(canRead(playlist, 'stranger-id', null)).toBe(true);
    });

    it('lets only members read a private playlist', () => {
      const privatePlaylist = buildPlaylist({ isPrivate: true });
      const participant = buildParticipant(false);

      expect(canRead(privatePlaylist, 'owner-id', null)).toBe(true);
      expect(
        canRead(privatePlaylist, 'participant-account-id', participant),
      ).toBe(true);
      expect(canRead(privatePlaylist, 'stranger-id', null)).toBe(false);
    });
  });

  describe('canActOnTracks', () => {
    const invitedOnlyPlaylist = buildPlaylist({
      license: PlaylistLicense.INVITED_ONLY,
    });

    it('lets every member act with the EVERYONE license', () => {
      const joinedParticipant = buildParticipant(false, JoinMethod.JOIN);

      expect(
        canActOnTracks(playlist, 'participant-account-id', joinedParticipant),
      ).toBe(true);
    });

    it('lets only invited participants act with the INVITED_ONLY license', () => {
      const joinedParticipant = buildParticipant(false, JoinMethod.JOIN);
      const invitedParticipant = buildParticipant(false, JoinMethod.INVITATION);

      expect(
        canActOnTracks(
          invitedOnlyPlaylist,
          'participant-account-id',
          joinedParticipant,
        ),
      ).toBe(false);
      expect(
        canActOnTracks(
          invitedOnlyPlaylist,
          'participant-account-id',
          invitedParticipant,
        ),
      ).toBe(true);
    });

    it('always lets the owner act', () => {
      expect(canActOnTracks(invitedOnlyPlaylist, 'owner-id', null)).toBe(true);
    });

    it('never lets a non member act', () => {
      expect(canActOnTracks(playlist, 'stranger-id', null)).toBe(false);
    });
  });

  describe('canDeleteTracks', () => {
    it('lets the owner and privileged participants delete', () => {
      const privilegedParticipant = buildParticipant(true);

      expect(canDeleteTracks(playlist, 'owner-id', null)).toBe(true);
      expect(
        canDeleteTracks(
          playlist,
          'participant-account-id',
          privilegedParticipant,
        ),
      ).toBe(true);
    });

    it('does not let a regular participant delete', () => {
      const regularParticipant = buildParticipant(false);

      expect(
        canDeleteTracks(playlist, 'participant-account-id', regularParticipant),
      ).toBe(false);
    });
  });

  describe('throwIfCannotActOnTracks', () => {
    const now = new Date('2026-06-15T20:00:00Z');

    it('rejects a non member', () => {
      const check = () =>
        throwIfCannotActOnTracks(
          playlist,
          'stranger-id',
          null,
          ON_SITE_POSITION,
          now,
        );

      expect(check).toThrow(NotPlaylistMember);
    });

    it('rejects a member the license excludes', () => {
      const invitedOnlyPlaylist = buildPlaylist({
        license: PlaylistLicense.INVITED_ONLY,
      });
      const joinedParticipant = buildParticipant(false, JoinMethod.JOIN);

      const check = () =>
        throwIfCannotActOnTracks(
          invitedOnlyPlaylist,
          'participant-account-id',
          joinedParticipant,
          ON_SITE_POSITION,
          now,
        );

      expect(check).toThrow(TrackActionForbidden);
    });

    it('requires a participant to be on site', () => {
      const participant = buildParticipant(false);

      const check = () =>
        throwIfCannotActOnTracks(
          playlist,
          'participant-account-id',
          participant,
          FAR_POSITION,
          now,
        );

      expect(check).toThrow(OutsidePlaylistZone);
    });

    it('lets the owner act from anywhere, even before the start', () => {
      const futurePlaylist = buildPlaylist({
        beginAt: new Date('2026-06-16T20:00:00Z'),
      });

      const check = () =>
        throwIfCannotActOnTracks(futurePlaylist, 'owner-id', null, null, now);

      expect(check).not.toThrow();
    });

    it('does not let the owner act once the playlist has ended', () => {
      const endedPlaylist = buildPlaylist({
        endAt: new Date('2026-06-15T19:00:00Z'),
      });

      const check = () =>
        throwIfCannotActOnTracks(endedPlaylist, 'owner-id', null, null, now);

      expect(check).toThrow(PlaylistEnded);
    });
  });

  describe('throwIfCannotDeleteTracks', () => {
    const now = new Date('2026-06-15T20:00:00Z');

    it('rejects a regular participant', () => {
      const regularParticipant = buildParticipant(false);

      const check = () =>
        throwIfCannotDeleteTracks(
          playlist,
          'participant-account-id',
          regularParticipant,
          ON_SITE_POSITION,
          now,
        );

      expect(check).toThrow(TrackDeleteForbidden);
    });

    it('requires a privileged participant to be on site', () => {
      const privilegedParticipant = buildParticipant(true);

      const check = () =>
        throwIfCannotDeleteTracks(
          playlist,
          'participant-account-id',
          privilegedParticipant,
          null,
          now,
        );

      expect(check).toThrow(OutsidePlaylistZone);
    });

    it('lets a privileged participant on site delete', () => {
      const privilegedParticipant = buildParticipant(true);

      const check = () =>
        throwIfCannotDeleteTracks(
          playlist,
          'participant-account-id',
          privilegedParticipant,
          ON_SITE_POSITION,
          now,
        );

      expect(check).not.toThrow();
    });
  });
});
