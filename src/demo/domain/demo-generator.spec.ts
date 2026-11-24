import { fakerFR as faker } from '@faker-js/faker';
import { Coordinates, distanceInMeters } from 'src/playlist/domain/geo';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { PlaylistStatus } from 'src/playlist/domain/playlist-status.enum';
import {
  PLAYLIST_ZONE_RADIUS_METERS,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from 'src/shared/constants';
import { DEV1_ACCOUNT, DEV2_ACCOUNT } from 'src/identity/domain/dev-accounts';
import {
  DEMO_ACCOUNT_ID_PREFIX,
  DEMO_GUEST,
  DEMO_OWNER,
} from './demo-accounts';
import { DemoContent, DemoPlaylist } from './demo-data';
import { DEMO_MAX_GENERATED_ACCOUNTS, generateDemo } from './demo-generator';
import { demoPlaylistViolations } from './demo-test-rules';

const NOW = new Date('2026-11-23T20:00:00Z');
const CAMPUS_42: Coordinates = { latitude: 48.8966, longitude: 2.3184 };
// The generated parties are placed up to 20 km away
const MAX_DISTANCE_METERS = 20_000;
const DEV_ACCOUNT_IDS = [DEV1_ACCOUNT.id, DEV2_ACCOUNT.id];
// The data is random: the rules are checked on several draws. Seeded only so
// that a failing draw can be replayed.
const DRAW_SEEDS = [1, 2, 3, 4, 5];

function demo(size: number, devAccountIds: string[] = []): DemoContent {
  return generateDemo({ size, now: NOW, origin: CAMPUS_42, devAccountIds });
}

function largestDemo(seed: number): DemoContent {
  faker.seed(seed);
  return demo(DEMO_MAX_GENERATED_ACCOUNTS, DEV_ACCOUNT_IDS);
}

function playlistNamed(content: DemoContent, name: string): DemoPlaylist {
  const found = content.playlists.find(
    (demoPlaylist) => demoPlaylist.infos.name === name,
  );
  if (found === undefined) {
    throw new Error(`No playlist named ${name}`);
  }
  return found;
}

function pairKey(first: string, second: string): string {
  return [first, second].sort().join('|');
}

describe('generateDemo', () => {
  it('only creates demo.owner, demo.guest and their playlists for a size of 0', () => {
    const content = demo(0);

    expect(content.accounts).toEqual([DEMO_OWNER, DEMO_GUEST]);
    expect(content.playlists).toHaveLength(5);
  });

  it('creates as many accounts as asked, and one playlist for two accounts', () => {
    const content = demo(100);

    expect(content.accounts).toHaveLength(2 + 100);
    expect(content.playlists).toHaveLength(5 + 50);
  });

  it('gives a new demo at every call', () => {
    const first = demo(20);
    const second = demo(20);

    expect(second.accounts).not.toEqual(first.accounts);
  });

  describe.each(DRAW_SEEDS)('with the draw %i', (seed) => {
    const content = largestDemo(seed);

    it('only creates playlists that follow the rules of the API', () => {
      const violations = content.playlists.flatMap((demoPlaylist) =>
        demoPlaylistViolations(demoPlaylist, NOW),
      );

      expect(violations).toEqual([]);
    });

    it('has unique and valid usernames, with ids of the demo', () => {
      const usernames = content.accounts.map((account) => account.username);

      expect(new Set(usernames).size).toBe(usernames.length);
      for (const account of content.accounts) {
        expect(account.username.length).toBeGreaterThanOrEqual(
          USERNAME_MIN_LENGTH,
        );
        expect(account.username.length).toBeLessThanOrEqual(
          USERNAME_MAX_LENGTH,
        );
        expect(account.id.startsWith(DEMO_ACCOUNT_ID_PREFIX)).toBe(true);
      }
    });

    it('has a playlist name unique for each owner', () => {
      const keys = content.playlists.map(
        (demoPlaylist) =>
          `${demoPlaylist.infos.ownerId}|${demoPlaylist.infos.name}`,
      );

      expect(new Set(keys).size).toBe(keys.length);
    });

    it('never makes a dev account own a playlist', () => {
      for (const demoPlaylist of content.playlists) {
        expect(DEV_ACCOUNT_IDS).not.toContain(demoPlaylist.infos.ownerId);
      }
    });

    it('places the VOTE parties within 20 km of the origin', () => {
      const votePlaylists = content.playlists
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

    it('never links an account to itself, nor twice the same pair', () => {
      const friendKeys = content.friendships.map((friendship) =>
        pairKey(friendship.userA, friendship.userB),
      );
      const requestKeys = content.friendshipRequests.map((request) =>
        pairKey(request.senderId, request.receiverId),
      );

      for (const friendship of content.friendships) {
        expect(friendship.userA).not.toBe(friendship.userB);
      }
      expect(new Set(friendKeys).size).toBe(friendKeys.length);
      expect(new Set(requestKeys).size).toBe(requestKeys.length);
      for (const requestKey of requestKeys) {
        expect(friendKeys).not.toContain(requestKey);
      }
    });
  });

  describe('the playlists of demo.owner', () => {
    const content = largestDemo(1);

    it('show every status', () => {
      const statusOf = (name: string) =>
        Playlist.create(playlistNamed(content, name).infos).status(NOW);

      expect(statusOf('Soirée en cours')).toBe(PlaylistStatus.LIVE);
      expect(statusOf('Soirée à venir')).toBe(PlaylistStatus.UPCOMING);
      expect(statusOf('Soirée terminée')).toBe(PlaylistStatus.ENDED);
    });

    it('include a live party that the guests can join from the origin', () => {
      const party = playlistNamed(content, 'Soirée en cours');
      const location = {
        latitude: party.infos.latitude ?? 0,
        longitude: party.infos.longitude ?? 0,
      };
      const memberIds = party.participants.map(
        (participant) => participant.accountId,
      );

      expect(distanceInMeters(CAMPUS_42, location)).toBeLessThanOrEqual(
        PLAYLIST_ZONE_RADIUS_METERS,
      );
      expect(memberIds).not.toContain(DEMO_GUEST.id);
    });

    it('make the guests members of the collaborative playlist', () => {
      const collaborative = playlistNamed(content, 'Playlist collaborative');
      const memberIds = collaborative.participants.map(
        (participant) => participant.accountId,
      );

      expect(memberIds).toEqual(
        expect.arrayContaining([DEMO_GUEST.id, ...DEV_ACCOUNT_IDS]),
      );
    });

    it('invite the guests to the private project', () => {
      const project = playlistNamed(content, 'Projet privé');
      const inviteeIds = project.invitations.map(
        (invitation) => invitation.inviteeId,
      );

      expect(inviteeIds).toEqual(
        expect.arrayContaining([DEMO_GUEST.id, ...DEV_ACCOUNT_IDS]),
      );
    });
  });

  it('does not refer to the dev accounts when they do not exist', () => {
    const json = JSON.stringify(demo(50));

    expect(json).not.toContain(DEV1_ACCOUNT.id);
    expect(json).not.toContain(DEV2_ACCOUNT.id);
  });
});
