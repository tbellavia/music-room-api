import { Coordinates, distanceInMeters } from 'src/playlist/domain/geo';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { PlaylistStatus } from 'src/playlist/domain/playlist-status.enum';
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from 'src/shared/constants';
import { DEMO_ACCOUNTS, DEMO_ACCOUNT_ID_PREFIX } from './demo-accounts';
import {
  DEMO_CROWD_MAX_ACCOUNTS,
  DemoCrowd,
  buildDemoCrowd,
} from './demo-crowd';
import { demoPlaylistViolations } from './demo-test-rules';

const NOW = new Date('2026-11-23T20:00:00Z');
const CAMPUS_42: Coordinates = { latitude: 48.8966, longitude: 2.3184 };
// The crowd places its parties up to 20 km away
const MAX_DISTANCE_METERS = 20_000;

function crowd(size: number): DemoCrowd {
  return buildDemoCrowd({ size, now: NOW, origin: CAMPUS_42 });
}

function pairKey(first: string, second: string): string {
  return [first, second].sort().join('|');
}

describe('buildDemoCrowd', () => {
  const largestCrowd = crowd(DEMO_CROWD_MAX_ACCOUNTS);

  it('is empty for a size of 0', () => {
    const emptyCrowd = crowd(0);

    expect(emptyCrowd.accounts).toEqual([]);
    expect(emptyCrowd.playlists).toEqual([]);
  });

  it('creates as many accounts as asked, and one playlist for two accounts', () => {
    const generated = crowd(100);

    expect(generated.accounts).toHaveLength(100);
    expect(generated.playlists).toHaveLength(50);
  });

  it('always generates the same crowd', () => {
    const first = crowd(50);
    const second = crowd(50);

    const firstNames = first.playlists.map((playlist) => playlist.infos.name);
    const secondNames = second.playlists.map((playlist) => playlist.infos.name);
    expect(second.accounts).toEqual(first.accounts);
    expect(secondNames).toEqual(firstNames);
  });

  describe('accounts', () => {
    it('have unique and valid usernames, unlike the scenario ones', () => {
      const usernames = largestCrowd.accounts.map(
        (account) => account.username,
      );
      const scenarioUsernames = DEMO_ACCOUNTS.map(
        (account) => account.username,
      );

      expect(new Set(usernames).size).toBe(usernames.length);
      for (const username of usernames) {
        expect(username.length).toBeGreaterThanOrEqual(USERNAME_MIN_LENGTH);
        expect(username.length).toBeLessThanOrEqual(USERNAME_MAX_LENGTH);
        expect(scenarioUsernames).not.toContain(username);
      }
    });

    it('have ids of the demo, different from the scenario ones', () => {
      const scenarioIds = DEMO_ACCOUNTS.map((account) => account.id);

      for (const account of largestCrowd.accounts) {
        expect(account.id.startsWith(DEMO_ACCOUNT_ID_PREFIX)).toBe(true);
        expect(scenarioIds).not.toContain(account.id);
      }
    });
  });

  describe('playlists', () => {
    it.each(
      largestCrowd.playlists.map((demoPlaylist) => [
        demoPlaylist.infos.name,
        demoPlaylist,
      ]),
    )('%s follows the rules of the API', (_name, demoPlaylist) => {
      expect(demoPlaylistViolations(demoPlaylist, NOW)).toEqual([]);
    });

    it('only involve crowd accounts, never the scenario ones', () => {
      const crowdIds = largestCrowd.accounts.map((account) => account.id);

      for (const demoPlaylist of largestCrowd.playlists) {
        expect(crowdIds).toContain(demoPlaylist.infos.ownerId);
        for (const participant of demoPlaylist.participants) {
          expect(crowdIds).toContain(participant.accountId);
        }
        for (const invitation of demoPlaylist.invitations) {
          expect(crowdIds).toContain(invitation.inviteeId);
        }
      }
    });

    it('have a name unique for each owner', () => {
      const keys = largestCrowd.playlists.map(
        (demoPlaylist) =>
          `${demoPlaylist.infos.ownerId}|${demoPlaylist.infos.name}`,
      );

      expect(new Set(keys).size).toBe(keys.length);
    });

    it('mix live, upcoming and ended playlists of both types', () => {
      const playlists = largestCrowd.playlists.map((demoPlaylist) =>
        Playlist.create(demoPlaylist.infos),
      );
      const statuses = new Set(
        playlists.map((playlist) => playlist.status(NOW)),
      );

      expect(statuses).toEqual(
        new Set([
          PlaylistStatus.LIVE,
          PlaylistStatus.UPCOMING,
          PlaylistStatus.ENDED,
        ]),
      );
      expect(playlists.some((playlist) => playlist.isVotePlaylist())).toBe(
        true,
      );
      expect(playlists.some((playlist) => playlist.isEditorPlaylist())).toBe(
        true,
      );
      expect(playlists.some((playlist) => playlist.isPrivate)).toBe(true);
    });

    it('place the VOTE parties within 20 km of the origin', () => {
      const votePlaylists = largestCrowd.playlists
        .map((demoPlaylist) => Playlist.create(demoPlaylist.infos))
        .filter((playlist) => playlist.isVotePlaylist());

      for (const playlist of votePlaylists) {
        const location = {
          latitude: playlist.latitude ?? 0,
          longitude: playlist.longitude ?? 0,
        };
        expect(distanceInMeters(CAMPUS_42, location)).toBeLessThanOrEqual(
          MAX_DISTANCE_METERS + 1,
        );
      }
    });
  });

  describe('social graph', () => {
    it('never links an account to itself, nor twice the same pair', () => {
      const friendKeys = largestCrowd.friendships.map((friendship) =>
        pairKey(friendship.userA, friendship.userB),
      );
      const requestKeys = largestCrowd.friendshipRequests.map((request) =>
        pairKey(request.senderId, request.receiverId),
      );

      for (const friendship of largestCrowd.friendships) {
        expect(friendship.userA).not.toBe(friendship.userB);
      }
      expect(new Set(friendKeys).size).toBe(friendKeys.length);
      expect(new Set(requestKeys).size).toBe(requestKeys.length);
      for (const requestKey of requestKeys) {
        expect(friendKeys).not.toContain(requestKey);
      }
    });
  });
});
