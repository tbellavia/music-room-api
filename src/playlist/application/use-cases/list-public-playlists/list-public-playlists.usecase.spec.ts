import { playlistInfos } from 'src/playlist/domain/playlist-test-infos';
import { InMemoryAccountDirectory } from 'src/playlist/infrastructure/persistence/account/in-memory-account-directory';
import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import {
  CreatePlaylistInfos,
  Playlist,
} from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import { PlaylistRole } from 'src/playlist/domain/playlist-role.enum';
import { PlaylistStatus } from 'src/playlist/domain/playlist-status.enum';
import { Participant } from 'src/playlist/domain/participant.entity';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { Coordinates } from 'src/playlist/domain/geo';
import { ListPublicPlaylistsUseCase } from './list-public-playlists.usecase';
import { ListPublicPlaylistsOutput } from './list-public-playlists.contracts';

const CALLER_ID = 'caller-id';
const CREATED_AT = new Date('2026-01-01T00:00:00Z');

// One degree of latitude is ~111 195 meters
const ONE_METER_IN_LATITUDE_DEGREES = 1 / 111_195;
const POSITION_300_METERS_AWAY: Coordinates = {
  latitude: 48.8966 + 300 * ONE_METER_IN_LATITUDE_DEGREES,
  longitude: 2.3184,
};
const POSITION_2_KILOMETERS_AWAY: Coordinates = {
  latitude: 48.8966 + 2000 * ONE_METER_IN_LATITUDE_DEGREES,
  longitude: 2.3184,
};

const defaultInfos: CreatePlaylistInfos = {
  id: 'playlist-id',
  type: PlaylistType.VOTE,
  ownerId: 'owner-id',
  name: 'Soirée',
  description: 'Une soirée à 42',
  latitude: 48.8966,
  longitude: 2.3184,
  address: '96 boulevard Bessières, Paris',
  createdAt: CREATED_AT,
};

describe('ListPublicPlaylistsUseCase', () => {
  let repository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let accountDirectory: InMemoryAccountDirectory;
  let useCase: ListPublicPlaylistsUseCase;

  async function givenPlaylist(overrides: Partial<CreatePlaylistInfos>) {
    const playlist = Playlist.create(playlistInfos(defaultInfos, overrides));
    await repository.save(playlist);
  }

  async function givenCallerParticipates(
    playlistId: string,
    hasPrivilege: boolean,
  ) {
    const participant = Participant.create({
      id: `${playlistId}-participant`,
      playlistId,
      accountId: CALLER_ID,
      joinedVia: JoinMethod.JOIN,
    });
    participant.hasPrivilege = hasPrivilege;
    await participantRepository.save(participant);
  }

  async function list(
    position: Coordinates | null = null,
  ): Promise<ListPublicPlaylistsOutput> {
    return await useCase.execute({ accountId: CALLER_ID, position });
  }

  beforeEach(() => {
    repository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    accountDirectory = new InMemoryAccountDirectory();
    accountDirectory.add({ id: 'owner-id', username: 'owner' });
    useCase = new ListPublicPlaylistsUseCase(
      repository,
      participantRepository,
      accountDirectory,
    );
  });

  it('returns an empty list when there is no playlist', async () => {
    const output = await list();

    expect(output.playlists).toEqual([]);
  });

  it('returns public playlists of both types', async () => {
    await givenPlaylist({ id: 'vote', type: PlaylistType.VOTE });
    await givenPlaylist({ id: 'editor', type: PlaylistType.EDITOR });

    const output = await list();

    const ids = output.playlists.map((playlist) => playlist.id);
    expect(ids).toEqual(['vote', 'editor']);
  });

  it('does not return private playlists', async () => {
    await givenPlaylist({ id: 'public' });
    await givenPlaylist({ id: 'private', isPrivate: true });

    const output = await list();

    const ids = output.playlists.map((playlist) => playlist.id);
    expect(ids).toEqual(['public']);
  });

  it('does not return ended playlists', async () => {
    await givenPlaylist({ id: 'ended', endAt: new Date('2000-01-01') });
    await givenPlaylist({ id: 'running', endAt: new Date('2999-01-01') });

    const output = await list();

    const ids = output.playlists.map((playlist) => playlist.id);
    expect(ids).toEqual(['running']);
  });

  it('returns playlists that have not begun yet', async () => {
    await givenPlaylist({
      id: 'upcoming',
      beginAt: new Date('2998-01-01'),
      endAt: new Date('2999-01-01'),
    });

    const output = await list();

    const ids = output.playlists.map((playlist) => playlist.id);
    expect(ids).toEqual(['upcoming']);
  });

  it('exposes the playlist informations', async () => {
    await givenPlaylist({ id: 'playlist-id' });

    const output = await list();

    expect(output.playlists[0]).toEqual({
      id: 'playlist-id',
      type: PlaylistType.VOTE,
      license: PlaylistLicense.EVERYONE,
      ownerId: 'owner-id',
      ownerUsername: 'owner',
      name: 'Soirée',
      description: 'Une soirée à 42',
      isPrivate: false,
      beginAt: null,
      endAt: null,
      latitude: 48.8966,
      longitude: 2.3184,
      address: '96 boulevard Bessières, Paris',
      coverPath: null,
      createdAt: CREATED_AT,
      status: PlaylistStatus.LIVE,
      role: null,
      hasPrivilege: false,
      distanceMeters: null,
      canJoinHere: false,
    });
  });

  it('gives the username of the owner of each playlist', async () => {
    accountDirectory.add({ id: 'bob-id', username: 'bob' });
    await givenPlaylist({ id: 'owner-playlist' });
    await givenPlaylist({ id: 'bob-playlist', ownerId: 'bob-id' });

    const output = await list();

    const usernames = output.playlists.map(
      (playlist) => playlist.ownerUsername,
    );
    expect(usernames).toEqual(['owner', 'bob']);
  });

  it('gives a null username when the owner cannot be found', async () => {
    await givenPlaylist({ id: 'orphan', ownerId: 'unknown-id' });

    const output = await list();

    expect(output.playlists[0].ownerUsername).toBeNull();
  });

  it('gives a null address for an editor playlist', async () => {
    await givenPlaylist({ id: 'editor', type: PlaylistType.EDITOR });

    const output = await list();

    expect(output.playlists[0].address).toBeNull();
  });

  describe('caller membership', () => {
    it('gives the OWNER role on a playlist of the caller', async () => {
      await givenPlaylist({ id: 'mine', ownerId: CALLER_ID });

      const output = await list();

      expect(output.playlists[0].role).toBe(PlaylistRole.OWNER);
      expect(output.playlists[0].hasPrivilege).toBe(true);
    });

    it('gives the PARTICIPANT role and the privilege on a joined playlist', async () => {
      await givenPlaylist({ id: 'joined' });
      await givenCallerParticipates('joined', true);

      const output = await list();

      expect(output.playlists[0].role).toBe(PlaylistRole.PARTICIPANT);
      expect(output.playlists[0].hasPrivilege).toBe(true);
    });

    it('gives no role and no privilege when the caller is not a member', async () => {
      await givenPlaylist({ id: 'other' });

      const output = await list();

      expect(output.playlists[0].role).toBeNull();
      expect(output.playlists[0].hasPrivilege).toBe(false);
    });
  });

  describe('position', () => {
    it('gives the distance to a vote playlist, rounded to the meter', async () => {
      await givenPlaylist({ id: 'vote' });

      const output = await list(POSITION_300_METERS_AWAY);

      expect(output.playlists[0].distanceMeters).toBe(300);
    });

    it('gives no distance to an editor playlist', async () => {
      await givenPlaylist({ id: 'editor', type: PlaylistType.EDITOR });

      const output = await list(POSITION_300_METERS_AWAY);

      expect(output.playlists[0].distanceMeters).toBeNull();
    });
  });

  describe('canJoinHere', () => {
    it('is true for a running vote playlist within the zone', async () => {
      await givenPlaylist({ id: 'vote' });

      const output = await list(POSITION_300_METERS_AWAY);

      expect(output.playlists[0].canJoinHere).toBe(true);
    });

    it('is false for a vote playlist outside the zone', async () => {
      await givenPlaylist({ id: 'vote' });

      const output = await list(POSITION_2_KILOMETERS_AWAY);

      expect(output.playlists[0].canJoinHere).toBe(false);
    });

    it('is true for a running editor playlist, without position', async () => {
      await givenPlaylist({ id: 'editor', type: PlaylistType.EDITOR });

      const output = await list();

      expect(output.playlists[0].canJoinHere).toBe(true);
    });

    it('is false for a playlist that has not begun yet', async () => {
      await givenPlaylist({
        id: 'upcoming',
        type: PlaylistType.EDITOR,
        beginAt: new Date('2998-01-01'),
      });

      const output = await list();

      expect(output.playlists[0].canJoinHere).toBe(false);
      expect(output.playlists[0].status).toBe(PlaylistStatus.UPCOMING);
    });

    it('is false when the caller is already a member', async () => {
      await givenPlaylist({ id: 'joined', type: PlaylistType.EDITOR });
      await givenCallerParticipates('joined', false);
      await givenPlaylist({
        id: 'mine',
        type: PlaylistType.EDITOR,
        ownerId: CALLER_ID,
        name: 'Mine',
      });

      const output = await list();

      const canJoin = output.playlists.map((playlist) => playlist.canJoinHere);
      expect(canJoin).toEqual([false, false]);
    });
  });
});
