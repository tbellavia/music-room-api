import { Coordinates } from 'src/playlist/domain/geo';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { PlaylistStatus } from 'src/playlist/domain/playlist-status.enum';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { DEV1_ACCOUNT, DEV2_ACCOUNT } from 'src/identity/domain/dev-accounts';
import { DEMO_ACCOUNTS } from './demo-accounts';
import { DemoPlaylist, DemoScenario, buildDemoScenario } from './demo-scenario';

const NOW = new Date('2026-11-23T20:00:00Z');
const CAMPUS_42: Coordinates = { latitude: 48.8966, longitude: 2.3184 };

function scenario(withDevAccounts = false): DemoScenario {
  return buildDemoScenario({ now: NOW, origin: CAMPUS_42, withDevAccounts });
}

function playlistsOf(demo: DemoScenario): Playlist[] {
  return demo.playlists.map((demoPlaylist) =>
    Playlist.create(demoPlaylist.infos),
  );
}

function memberIds(demoPlaylist: DemoPlaylist): string[] {
  const participantIds = demoPlaylist.participants.map(
    (participant) => participant.accountId,
  );
  return [demoPlaylist.infos.ownerId, ...participantIds];
}

function knownAccountIds(): string[] {
  const demoIds = DEMO_ACCOUNTS.map((account) => account.id);
  return [...demoIds, DEV1_ACCOUNT.id, DEV2_ACCOUNT.id];
}

describe('buildDemoScenario', () => {
  it('only builds playlists that respect the domain rules', () => {
    expect(() => playlistsOf(scenario(true))).not.toThrow();
  });

  it('only refers to demo accounts without the dev accounts', () => {
    const json = JSON.stringify(scenario(false));

    expect(json).not.toContain(DEV1_ACCOUNT.id);
    expect(json).not.toContain(DEV2_ACCOUNT.id);
  });

  it('gives content to dev1 and dev2 when they exist', () => {
    const demo = scenario(true);

    const dev1Playlists = demo.playlists.filter((demoPlaylist) =>
      memberIds(demoPlaylist).includes(DEV1_ACCOUNT.id),
    );
    const dev1Invitations = demo.playlists.flatMap((demoPlaylist) =>
      demoPlaylist.invitations.filter(
        (invitation) => invitation.inviteeId === DEV1_ACCOUNT.id,
      ),
    );
    const dev2Requests = demo.friendshipRequests.filter(
      (request) => request.receiverId === DEV2_ACCOUNT.id,
    );
    expect(dev1Playlists.length).toBeGreaterThan(0);
    expect(dev1Invitations.length).toBeGreaterThan(0);
    expect(dev2Requests.length).toBeGreaterThan(0);
  });

  describe('shows every case of the subject', () => {
    const playlists = playlistsOf(scenario());

    it('a live VOTE party that can be joined from the origin', () => {
      const joinable = playlists.filter(
        (playlist) =>
          playlist.isVotePlaylist() && playlist.canBeJoinedFrom(CAMPUS_42, NOW),
      );

      expect(joinable.length).toBeGreaterThan(0);
    });

    it('a live VOTE party too far to be joined from the origin', () => {
      const tooFar = playlists.filter(
        (playlist) =>
          playlist.isVotePlaylist() &&
          playlist.status(NOW) === PlaylistStatus.LIVE &&
          !playlist.isWithinZone(CAMPUS_42),
      );

      expect(tooFar.length).toBeGreaterThan(0);
    });

    it('upcoming and ended VOTE parties', () => {
      const statuses = playlists
        .filter((playlist) => playlist.isVotePlaylist())
        .map((playlist) => playlist.status(NOW));

      expect(statuses).toContain(PlaylistStatus.UPCOMING);
      expect(statuses).toContain(PlaylistStatus.ENDED);
    });

    it('EDITOR playlists, one of them INVITED_ONLY', () => {
      const editorLicenses = playlists
        .filter((playlist) => playlist.isEditorPlaylist())
        .map((playlist) => playlist.license);

      expect(editorLicenses).toContain(PlaylistLicense.EVERYONE);
      expect(editorLicenses).toContain(PlaylistLicense.INVITED_ONLY);
    });

    it('a private playlist', () => {
      const privatePlaylists = playlists.filter(
        (playlist) => playlist.isPrivate,
      );

      expect(privatePlaylists.length).toBeGreaterThan(0);
    });
  });

  describe('each playlist', () => {
    const demoPlaylists = scenario(true).playlists;

    it.each(
      demoPlaylists.map((demoPlaylist) => [
        demoPlaylist.infos.name,
        demoPlaylist,
      ]),
    )(
      '%s: tracks are added and voted by its members only',
      (_name, demoPlaylist) => {
        const members = memberIds(demoPlaylist);
        for (const track of demoPlaylist.tracks) {
          expect(members).toContain(track.addedBy);
          for (const voterId of track.voterIds) {
            expect(members).toContain(voterId);
          }
        }
      },
    );

    it.each(
      demoPlaylists.map((demoPlaylist) => [
        demoPlaylist.infos.name,
        demoPlaylist,
      ]),
    )(
      '%s: a music waits at most once, one vote per account',
      (_name, demoPlaylist) => {
        const waitingVideoIds = demoPlaylist.tracks
          .filter((track) => track.playedAt === null)
          .map((track) => track.music.videoId);
        expect(new Set(waitingVideoIds).size).toBe(waitingVideoIds.length);

        for (const track of demoPlaylist.tracks) {
          expect(new Set(track.voterIds).size).toBe(track.voterIds.length);
        }
      },
    );

    it.each(
      demoPlaylists.map((demoPlaylist) => [
        demoPlaylist.infos.name,
        demoPlaylist,
      ]),
    )(
      '%s: tracks are added in the past, never played or voted in an EDITOR playlist',
      (_name, demoPlaylist) => {
        const isEditor = demoPlaylist.infos.type === PlaylistType.EDITOR;
        for (const track of demoPlaylist.tracks) {
          expect(track.addedAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
          if (isEditor) {
            expect(track.playedAt).toBeNull();
            expect(track.voterIds).toEqual([]);
          }
        }
      },
    );

    it.each(
      demoPlaylists.map((demoPlaylist) => [
        demoPlaylist.infos.name,
        demoPlaylist,
      ]),
    )(
      '%s: with INVITED_ONLY, only the owner and the invited add tracks',
      (_name, demoPlaylist) => {
        if (demoPlaylist.infos.license !== PlaylistLicense.INVITED_ONLY) {
          return;
        }
        const allowedIds = demoPlaylist.participants
          .filter(
            (participant) => participant.joinedVia === JoinMethod.INVITATION,
          )
          .map((participant) => participant.accountId);
        allowedIds.push(demoPlaylist.infos.ownerId);
        for (const track of demoPlaylist.tracks) {
          expect(allowedIds).toContain(track.addedBy);
        }
      },
    );

    it.each(
      demoPlaylists.map((demoPlaylist) => [
        demoPlaylist.infos.name,
        demoPlaylist,
      ]),
    )(
      '%s: invitations come from the owner or a privileged participant, to non-members',
      (_name, demoPlaylist) => {
        const members = memberIds(demoPlaylist);
        const privilegedIds = demoPlaylist.participants
          .filter((participant) => participant.hasPrivilege)
          .map((participant) => participant.accountId);
        privilegedIds.push(demoPlaylist.infos.ownerId);

        for (const invitation of demoPlaylist.invitations) {
          expect(privilegedIds).toContain(invitation.inviterId);
          expect(members).not.toContain(invitation.inviteeId);
        }
      },
    );
  });

  describe('social graph', () => {
    const demo = scenario(true);

    function pairKey(first: string, second: string): string {
      return [first, second].sort().join('|');
    }

    it('only links known accounts, never an account to itself', () => {
      const accountIds = knownAccountIds();
      for (const friendship of demo.friendships) {
        expect(accountIds).toContain(friendship.userA);
        expect(accountIds).toContain(friendship.userB);
        expect(friendship.userA).not.toBe(friendship.userB);
      }
      for (const request of demo.friendshipRequests) {
        expect(accountIds).toContain(request.senderId);
        expect(accountIds).toContain(request.receiverId);
      }
    });

    it('has no pending request between two friends, and no duplicate', () => {
      const friendKeys = demo.friendships.map((friendship) =>
        pairKey(friendship.userA, friendship.userB),
      );
      const requestKeys = demo.friendshipRequests.map((request) =>
        pairKey(request.senderId, request.receiverId),
      );

      expect(new Set(friendKeys).size).toBe(friendKeys.length);
      expect(new Set(requestKeys).size).toBe(requestKeys.length);
      for (const requestKey of requestKeys) {
        expect(friendKeys).not.toContain(requestKey);
      }
    });
  });

  it('places the parties around the origin it is given', () => {
    const elsewhere: Coordinates = { latitude: 45.764, longitude: 4.8357 };

    const demo = buildDemoScenario({
      now: NOW,
      origin: elsewhere,
      withDevAccounts: false,
    });

    const joinable = playlistsOf(demo).filter((playlist) =>
      playlist.canBeJoinedFrom(elsewhere, NOW),
    );
    expect(joinable.some((playlist) => playlist.isVotePlaylist())).toBe(true);
  });
});
