import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import { PlaylistAlreadyExists } from 'src/playlist/domain/errors/playlist-already-exists.error';
import { InvalidPlaylistPeriod } from 'src/playlist/domain/errors/invalid-playlist-period.error';
import { PlaylistEndInPast } from 'src/playlist/domain/errors/playlist-end-in-past.error';
import { LocationNotAllowed } from 'src/playlist/domain/errors/location-not-allowed.error';
import { LocationRequired } from 'src/playlist/domain/errors/location-required.error';
import { CreatePlaylistUseCase } from './create-playlist.usecase';
import { CreatePlaylistInput } from './create-playlist.contracts';

describe('CreatePlaylistUseCase', () => {
  let repository: InMemoryPlaylistRepository;
  let useCase: CreatePlaylistUseCase;

  const input: CreatePlaylistInput = {
    ownerId: 'owner-id',
    type: PlaylistType.VOTE,
    name: 'Soirée',
    description: 'Une soirée à 42',
    latitude: 48.8966,
    longitude: 2.3184,
    address: '96 boulevard Bessières, Paris',
  };

  const editorInput: CreatePlaylistInput = {
    ownerId: 'owner-id',
    type: PlaylistType.EDITOR,
    name: 'Radio',
    description: 'Une radio collaborative',
  };

  beforeEach(() => {
    repository = new InMemoryPlaylistRepository();
    useCase = new CreatePlaylistUseCase(repository);
  });

  it('creates a vote playlist owned by the caller', async () => {
    const { id } = await useCase.execute(input);

    const saved = await repository.findById(id);
    expect(saved).not.toBeNull();
    expect(saved?.type).toBe(PlaylistType.VOTE);
    expect(saved?.ownerId).toBe('owner-id');
    expect(saved?.isPrivate).toBe(false);
  });

  it('saves the location and the address of a vote playlist', async () => {
    const { id } = await useCase.execute(input);

    const saved = await repository.findById(id);
    expect(saved?.latitude).toBe(48.8966);
    expect(saved?.longitude).toBe(2.3184);
    expect(saved?.address).toBe('96 boulevard Bessières, Paris');
  });

  it('creates an editor playlist without location', async () => {
    const { id } = await useCase.execute(editorInput);

    const saved = await repository.findById(id);
    expect(saved).not.toBeNull();
    expect(saved?.type).toBe(PlaylistType.EDITOR);
    expect(saved?.latitude).toBeNull();
    expect(saved?.longitude).toBeNull();
    expect(saved?.address).toBeNull();
  });

  it('rejects an editor playlist sent with a location, without saving it', async () => {
    const creation = useCase.execute({
      ...editorInput,
      latitude: 48.8966,
      longitude: 2.3184,
      address: '96 boulevard Bessières, Paris',
    });

    await expect(creation).rejects.toThrow(LocationNotAllowed);
    expect(repository.playlists.size).toBe(0);
  });

  it('rejects an editor playlist sent with a latitude only', async () => {
    const creation = useCase.execute({ ...editorInput, latitude: 48.8966 });

    await expect(creation).rejects.toThrow(LocationNotAllowed);
  });

  it('rejects an editor playlist sent with an address only', async () => {
    const creation = useCase.execute({
      ...editorInput,
      address: '96 boulevard Bessières, Paris',
    });

    await expect(creation).rejects.toThrow(LocationNotAllowed);
    expect(repository.playlists.size).toBe(0);
  });

  it('rejects a vote playlist without address, without saving it', async () => {
    const creation = useCase.execute({ ...input, address: undefined });

    await expect(creation).rejects.toThrow(LocationRequired);
    expect(repository.playlists.size).toBe(0);
  });

  it('rejects a vote playlist without location', async () => {
    const creation = useCase.execute({
      ...input,
      latitude: undefined,
      longitude: undefined,
    });

    await expect(creation).rejects.toThrow(LocationRequired);
  });

  it('uses the EVERYONE license by default', async () => {
    const { id } = await useCase.execute(input);

    const saved = await repository.findById(id);
    expect(saved?.license).toBe(PlaylistLicense.EVERYONE);
  });

  it('creates a playlist with the INVITED_ONLY license', async () => {
    const { id } = await useCase.execute({
      ...input,
      license: PlaylistLicense.INVITED_ONLY,
    });

    const saved = await repository.findById(id);
    expect(saved?.license).toBe(PlaylistLicense.INVITED_ONLY);
  });

  it('creates a private playlist with a period', async () => {
    const beginAt = new Date('2999-12-31T16:00:00Z');
    const endAt = new Date('2999-12-31T18:00:00Z');

    const { id } = await useCase.execute({
      ...input,
      isPrivate: true,
      beginAt,
      endAt,
    });

    const saved = await repository.findById(id);
    expect(saved).not.toBeNull();
    expect(saved?.isPrivate).toBe(true);
    expect(saved?.beginAt).toEqual(beginAt);
    expect(saved?.endAt).toEqual(endAt);
  });

  it('rejects a second playlist with the same name for the same owner', async () => {
    await useCase.execute(input);

    await expect(
      useCase.execute({ ...editorInput, name: input.name }),
    ).rejects.toThrow(PlaylistAlreadyExists);
    expect(repository.playlists.size).toBe(1);
  });

  it('allows the same name for different owners', async () => {
    await useCase.execute(input);
    await useCase.execute({ ...input, ownerId: 'other-owner' });

    expect(repository.playlists.size).toBe(2);
  });

  it('does not save a playlist with an invalid period', async () => {
    await expect(
      useCase.execute({
        ...input,
        beginAt: new Date('2999-12-31T18:00:00Z'),
        endAt: new Date('2999-12-31T16:00:00Z'),
      }),
    ).rejects.toThrow(InvalidPlaylistPeriod);
    expect(repository.playlists.size).toBe(0);
  });

  it('rejects a playlist that has already ended', async () => {
    await expect(
      useCase.execute({
        ...input,
        endAt: new Date('2000-01-01T00:00:00Z'),
      }),
    ).rejects.toThrow(PlaylistEndInPast);
    expect(repository.playlists.size).toBe(0);
  });

  it('rejects an ended period even if it began in the past too', async () => {
    await expect(
      useCase.execute({
        ...input,
        beginAt: new Date('2000-01-01T00:00:00Z'),
        endAt: new Date('2000-01-02T00:00:00Z'),
      }),
    ).rejects.toThrow(PlaylistEndInPast);
    expect(repository.playlists.size).toBe(0);
  });

  it('accepts a playlist that already began but ends in the future', async () => {
    const beginAt = new Date('2000-01-01T00:00:00Z');
    const endAt = new Date('2999-01-01T00:00:00Z');

    const { id } = await useCase.execute({ ...input, beginAt, endAt });

    const saved = await repository.findById(id);
    expect(saved).not.toBeNull();
    expect(saved?.beginAt).toEqual(beginAt);
  });
});
