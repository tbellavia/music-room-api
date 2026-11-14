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
import { PlaylistRole } from 'src/playlist/domain/playlist-role.enum';
import { PlaylistStatus } from 'src/playlist/domain/playlist-status.enum';
import { ListMyPlaylistsUseCase } from './list-my-playlists.usecase';
import { SortOrder } from './list-my-playlists.contracts';

const ALICE_ID = 'alice-id';
const BOB_ID = 'bob-id';

const JANUARY = new Date('2026-01-01T00:00:00Z');
const FEBRUARY = new Date('2026-02-01T00:00:00Z');
const MARCH = new Date('2026-03-01T00:00:00Z');

type ListOptions = {
  role?: PlaylistRole;
  status?: PlaylistStatus;
  order?: SortOrder;
};

const defaultInfos: CreatePlaylistInfos = {
  id: 'playlist-id',
  type: PlaylistType.VOTE,
  ownerId: ALICE_ID,
  name: 'Soirée',
  description: '',
  latitude: 48.8966,
  longitude: 2.3184,
  address: '96 boulevard Bessières, Paris',
  createdAt: JANUARY,
};

describe('ListMyPlaylistsUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let useCase: ListMyPlaylistsUseCase;

  async function givenPlaylist(overrides: Partial<CreatePlaylistInfos>) {
    const playlist = Playlist.create(playlistInfos(defaultInfos, overrides));
    await playlistRepository.save(playlist);
  }

  async function givenParticipant(
    playlistId: string,
    accountId: string,
    hasPrivilege = false,
  ) {
    const participant = Participant.create({
      id: `${playlistId}-${accountId}`,
      playlistId,
      accountId,
      joinedVia: JoinMethod.JOIN,
    });
    participant.hasPrivilege = hasPrivilege;
    await participantRepository.save(participant);
  }

  async function listedIds(options: ListOptions = {}): Promise<string[]> {
    const output = await useCase.execute({ accountId: ALICE_ID, ...options });
    return output.playlists.map((playlist) => playlist.id);
  }

  beforeEach(() => {
    playlistRepository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    useCase = new ListMyPlaylistsUseCase(
      playlistRepository,
      participantRepository,
    );
  });

  it('returns an empty list when the account is in no playlist', async () => {
    expect(await listedIds()).toEqual([]);
  });

  it('returns the owned and the joined playlists, private ones included', async () => {
    await givenPlaylist({ id: 'owned', isPrivate: true });
    await givenPlaylist({ id: 'joined', ownerId: BOB_ID, name: 'Bob' });
    await givenParticipant('joined', ALICE_ID);

    const ids = await listedIds();

    expect(ids.sort()).toEqual(['joined', 'owned']);
  });

  it('does not return the playlists of other accounts', async () => {
    await givenPlaylist({ id: 'bob-playlist', ownerId: BOB_ID });

    expect(await listedIds()).toEqual([]);
  });

  it('gives the role and the privilege of the account', async () => {
    await givenPlaylist({ id: 'owned' });
    await givenPlaylist({ id: 'joined', ownerId: BOB_ID, name: 'Bob' });
    await givenParticipant('joined', ALICE_ID, true);

    const output = await useCase.execute({ accountId: ALICE_ID });

    const owned = output.playlists.find((playlist) => playlist.id === 'owned');
    const joined = output.playlists.find(
      (playlist) => playlist.id === 'joined',
    );
    expect(owned?.role).toBe(PlaylistRole.OWNER);
    expect(owned?.hasPrivilege).toBe(true);
    expect(joined?.role).toBe(PlaylistRole.PARTICIPANT);
    expect(joined?.hasPrivilege).toBe(true);
  });

  it('gives the address, null for an editor playlist', async () => {
    await givenPlaylist({ id: 'vote', name: 'A', createdAt: FEBRUARY });
    await givenPlaylist({ id: 'editor', name: 'B', type: PlaylistType.EDITOR });

    const output = await useCase.execute({ accountId: ALICE_ID });

    const addresses = output.playlists.map((playlist) => playlist.address);
    expect(addresses).toEqual(['96 boulevard Bessières, Paris', null]);
  });

  it('gives the status of each playlist', async () => {
    await givenPlaylist({
      id: 'upcoming',
      beginAt: new Date('2998-01-01'),
      endAt: new Date('2999-01-01'),
    });

    const output = await useCase.execute({ accountId: ALICE_ID });

    expect(output.playlists[0].status).toBe(PlaylistStatus.UPCOMING);
  });

  describe('order', () => {
    beforeEach(async () => {
      await givenPlaylist({ id: 'february', name: 'B', createdAt: FEBRUARY });
      await givenPlaylist({ id: 'january', name: 'A', createdAt: JANUARY });
      await givenPlaylist({ id: 'march', name: 'C', createdAt: MARCH });
    });

    it('returns the most recent first by default', async () => {
      expect(await listedIds()).toEqual(['march', 'february', 'january']);
    });

    it('returns the oldest first in ascending order', async () => {
      const ids = await listedIds({ order: SortOrder.ASC });

      expect(ids).toEqual(['january', 'february', 'march']);
    });
  });

  describe('filters', () => {
    beforeEach(async () => {
      await givenPlaylist({ id: 'owned', name: 'A' });
      await givenPlaylist({
        id: 'joined-upcoming',
        ownerId: BOB_ID,
        beginAt: new Date('2998-01-01'),
      });
      await givenParticipant('joined-upcoming', ALICE_ID);
    });

    it('keeps only the owned playlists', async () => {
      const ids = await listedIds({ role: PlaylistRole.OWNER });

      expect(ids).toEqual(['owned']);
    });

    it('keeps only the joined playlists', async () => {
      const ids = await listedIds({ role: PlaylistRole.PARTICIPANT });

      expect(ids).toEqual(['joined-upcoming']);
    });

    it('keeps only the playlists with the given status', async () => {
      const ids = await listedIds({ status: PlaylistStatus.LIVE });

      expect(ids).toEqual(['owned']);
    });
  });
});
