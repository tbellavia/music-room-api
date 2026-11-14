import { playlistInfos } from 'src/playlist/domain/playlist-test-infos';
import { InMemoryAccountDirectory } from 'src/playlist/infrastructure/persistence/account/in-memory-account-directory';
import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import {
  CreatePlaylistInfos,
  Playlist,
} from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import { ListPublicPlaylistsUseCase } from './list-public-playlists.usecase';

const defaultInfos: CreatePlaylistInfos = {
  id: 'playlist-id',
  type: PlaylistType.VOTE,
  ownerId: 'owner-id',
  name: 'Soirée',
  description: 'Une soirée à 42',
  latitude: 48.8966,
  longitude: 2.3184,
};

describe('ListPublicPlaylistsUseCase', () => {
  let repository: InMemoryPlaylistRepository;
  let accountDirectory: InMemoryAccountDirectory;
  let useCase: ListPublicPlaylistsUseCase;

  async function givenPlaylist(overrides: Partial<CreatePlaylistInfos>) {
    const playlist = Playlist.create(playlistInfos(defaultInfos, overrides));
    await repository.save(playlist);
  }

  beforeEach(() => {
    repository = new InMemoryPlaylistRepository();
    accountDirectory = new InMemoryAccountDirectory();
    accountDirectory.add({ id: 'owner-id', username: 'owner' });
    useCase = new ListPublicPlaylistsUseCase(repository, accountDirectory);
  });

  it('returns an empty list when there is no playlist', async () => {
    const output = await useCase.execute();

    expect(output.playlists).toEqual([]);
  });

  it('returns public playlists of both types', async () => {
    await givenPlaylist({ id: 'vote', type: PlaylistType.VOTE });
    await givenPlaylist({ id: 'editor', type: PlaylistType.EDITOR });

    const output = await useCase.execute();

    const ids = output.playlists.map((playlist) => playlist.id);
    expect(ids).toEqual(['vote', 'editor']);
  });

  it('does not return private playlists', async () => {
    await givenPlaylist({ id: 'public' });
    await givenPlaylist({ id: 'private', isPrivate: true });

    const output = await useCase.execute();

    const ids = output.playlists.map((playlist) => playlist.id);
    expect(ids).toEqual(['public']);
  });

  it('does not return ended playlists', async () => {
    await givenPlaylist({ id: 'ended', endAt: new Date('2000-01-01') });
    await givenPlaylist({ id: 'running', endAt: new Date('2999-01-01') });

    const output = await useCase.execute();

    const ids = output.playlists.map((playlist) => playlist.id);
    expect(ids).toEqual(['running']);
  });

  it('returns playlists that have not begun yet', async () => {
    await givenPlaylist({
      id: 'upcoming',
      beginAt: new Date('2998-01-01'),
      endAt: new Date('2999-01-01'),
    });

    const output = await useCase.execute();

    const ids = output.playlists.map((playlist) => playlist.id);
    expect(ids).toEqual(['upcoming']);
  });

  it('exposes the playlist informations', async () => {
    await givenPlaylist({ id: 'playlist-id' });

    const output = await useCase.execute();

    expect(output.playlists[0]).toEqual({
      id: 'playlist-id',
      type: PlaylistType.VOTE,
      license: PlaylistLicense.EVERYONE,
      ownerId: 'owner-id',
      ownerUsername: 'owner',
      name: 'Soirée',
      description: 'Une soirée à 42',
      beginAt: null,
      endAt: null,
      latitude: 48.8966,
      longitude: 2.3184,
      coverPath: null,
    });
  });

  it('gives the username of the owner of each playlist', async () => {
    accountDirectory.add({ id: 'bob-id', username: 'bob' });
    await givenPlaylist({ id: 'owner-playlist' });
    await givenPlaylist({ id: 'bob-playlist', ownerId: 'bob-id' });

    const output = await useCase.execute();

    const usernames = output.playlists.map(
      (playlist) => playlist.ownerUsername,
    );
    expect(usernames).toEqual(['owner', 'bob']);
  });

  it('gives a null username when the owner cannot be found', async () => {
    await givenPlaylist({ id: 'orphan', ownerId: 'unknown-id' });

    const output = await useCase.execute();

    expect(output.playlists[0].ownerUsername).toBeNull();
  });
});
