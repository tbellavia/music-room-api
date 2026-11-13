import { playlistInfos } from 'src/playlist/domain/playlist-test-infos';
import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import {
  CreatePlaylistInfos,
  Playlist,
} from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistRole } from 'src/playlist/domain/playlist-role.enum';
import {
  ListMyRecentPlaylistsUseCase,
  RECENT_PLAYLISTS_LIMIT,
} from './list-my-recent-playlists.usecase';

const ALICE_ID = 'alice-id';
const BOB_ID = 'bob-id';
const ONE_DAY = 24 * 60 * 60 * 1000;
const FIRST_DAY = new Date('2026-01-01T00:00:00Z');

const defaultInfos: CreatePlaylistInfos = {
  id: 'playlist-id',
  type: PlaylistType.EDITOR,
  ownerId: ALICE_ID,
  name: 'Playlist',
  description: '',
};

function dayAfterFirst(days: number): Date {
  return new Date(FIRST_DAY.getTime() + days * ONE_DAY);
}

describe('ListMyRecentPlaylistsUseCase', () => {
  let repository: InMemoryPlaylistRepository;
  let useCase: ListMyRecentPlaylistsUseCase;

  async function givenPlaylist(overrides: Partial<CreatePlaylistInfos>) {
    const playlist = Playlist.create(playlistInfos(defaultInfos, overrides));
    await repository.save(playlist);
  }

  // Created one per day, in order: playlist-0 is the oldest
  async function givenPlaylistsCreatedDayAfterDay(count: number) {
    for (let day = 0; day < count; day++) {
      await givenPlaylist({
        id: `playlist-${day}`,
        name: `Playlist ${day}`,
        createdAt: dayAfterFirst(day),
      });
    }
  }

  async function listedIds(): Promise<string[]> {
    const output = await useCase.execute({ accountId: ALICE_ID });
    return output.playlists.map((playlist) => playlist.id);
  }

  beforeEach(() => {
    repository = new InMemoryPlaylistRepository();
    useCase = new ListMyRecentPlaylistsUseCase(repository);
  });

  it('returns an empty list when the account created nothing', async () => {
    expect(await listedIds()).toEqual([]);
  });

  it('returns the created playlists, most recent first', async () => {
    await givenPlaylistsCreatedDayAfterDay(3);

    expect(await listedIds()).toEqual([
      'playlist-2',
      'playlist-1',
      'playlist-0',
    ]);
  });

  it(`keeps only the ${RECENT_PLAYLISTS_LIMIT} most recent`, async () => {
    await givenPlaylistsCreatedDayAfterDay(12);

    const ids = await listedIds();

    expect(ids).toHaveLength(RECENT_PLAYLISTS_LIMIT);
    expect(ids[0]).toBe('playlist-11');
    expect(ids).not.toContain('playlist-1');
    expect(ids).not.toContain('playlist-0');
  });

  it('includes the private and ended playlists', async () => {
    await givenPlaylist({ id: 'private', name: 'A', isPrivate: true });
    await givenPlaylist({
      id: 'ended',
      name: 'B',
      endAt: new Date('2000-01-01'),
    });

    const ids = await listedIds();

    expect(ids.sort()).toEqual(['ended', 'private']);
  });

  it('does not return the playlists created by others', async () => {
    await givenPlaylist({ id: 'bob-playlist', ownerId: BOB_ID });

    expect(await listedIds()).toEqual([]);
  });

  it('marks the account as the owner', async () => {
    await givenPlaylist({});

    const output = await useCase.execute({ accountId: ALICE_ID });

    expect(output.playlists[0].role).toBe(PlaylistRole.OWNER);
    expect(output.playlists[0].hasPrivilege).toBe(true);
  });
});
