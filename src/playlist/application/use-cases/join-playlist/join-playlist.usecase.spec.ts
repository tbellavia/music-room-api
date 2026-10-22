import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import {
  CreatePlaylistInfos,
  Playlist,
} from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { Participant } from 'src/playlist/domain/participant.entity';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { PrivatePlaylist } from 'src/playlist/domain/errors/private-playlist.error';
import { PlaylistEnded } from 'src/playlist/domain/errors/playlist-ended.error';
import { AlreadyParticipant } from 'src/playlist/domain/errors/already-participant.error';
import { OutsidePlaylistZone } from 'src/playlist/domain/errors/outside-playlist-zone.error';
import { JoinPlaylistUseCase } from './join-playlist.usecase';
import { JoinPlaylistInput } from './join-playlist.contracts';

// One degree of latitude is ~111 195 meters
const ONE_METER_IN_LATITUDE_DEGREES = 1 / 111_195;

const PLAYLIST_LATITUDE = 48.8966;
const PLAYLIST_LONGITUDE = 2.3184;

const defaultInfos: CreatePlaylistInfos = {
  id: 'playlist-id',
  type: PlaylistType.VOTE,
  ownerId: 'owner-id',
  name: 'Soirée',
  description: '',
  latitude: PLAYLIST_LATITUDE,
  longitude: PLAYLIST_LONGITUDE,
};

const input: JoinPlaylistInput = {
  playlistId: 'playlist-id',
  accountId: 'joiner-id',
  latitude: PLAYLIST_LATITUDE + 1500 * ONE_METER_IN_LATITUDE_DEGREES,
  longitude: PLAYLIST_LONGITUDE,
};

describe('JoinPlaylistUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let useCase: JoinPlaylistUseCase;

  async function givenPlaylist(overrides: Partial<CreatePlaylistInfos> = {}) {
    const playlist = Playlist.create({ ...defaultInfos, ...overrides });
    await playlistRepository.save(playlist);
  }

  beforeEach(() => {
    playlistRepository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    useCase = new JoinPlaylistUseCase(
      playlistRepository,
      participantRepository,
    );
  });

  it('adds the account as a participant without privilege', async () => {
    await givenPlaylist();

    const { participantId } = await useCase.execute(input);

    const participant = participantRepository.participants.get(participantId);
    expect(participant).toBeDefined();
    expect(participant?.playlistId).toBe('playlist-id');
    expect(participant?.accountId).toBe('joiner-id');
    expect(participant?.hasPrivilege).toBe(false);
  });

  it('lets a user join an editor playlist', async () => {
    await givenPlaylist({ type: PlaylistType.EDITOR });

    await useCase.execute(input);

    expect(participantRepository.participants.size).toBe(1);
  });

  it('lets a user join a playlist that has not begun yet', async () => {
    await givenPlaylist({
      beginAt: new Date('2998-01-01'),
      endAt: new Date('2999-01-01'),
    });

    await useCase.execute(input);

    expect(participantRepository.participants.size).toBe(1);
  });

  it('rejects an unknown playlist', async () => {
    await expect(useCase.execute(input)).rejects.toThrow(PlaylistNotFound);
  });

  it('rejects a private playlist', async () => {
    await givenPlaylist({ isPrivate: true });

    await expect(useCase.execute(input)).rejects.toThrow(PrivatePlaylist);
    expect(participantRepository.participants.size).toBe(0);
  });

  it('rejects an ended playlist', async () => {
    await givenPlaylist({ endAt: new Date('2000-01-01') });

    await expect(useCase.execute(input)).rejects.toThrow(PlaylistEnded);
    expect(participantRepository.participants.size).toBe(0);
  });

  it('rejects the owner of the playlist', async () => {
    await givenPlaylist();

    const ownerInput = { ...input, accountId: 'owner-id' };

    await expect(useCase.execute(ownerInput)).rejects.toThrow(
      AlreadyParticipant,
    );
  });

  it('rejects an account that already joined', async () => {
    await givenPlaylist();
    const existing = Participant.create({
      id: 'participant-id',
      playlistId: 'playlist-id',
      accountId: 'joiner-id',
    });
    await participantRepository.save(existing);

    await expect(useCase.execute(input)).rejects.toThrow(AlreadyParticipant);
    expect(participantRepository.participants.size).toBe(1);
  });

  it('rejects a position farther than 2 km', async () => {
    await givenPlaylist();

    const farInput = {
      ...input,
      latitude: PLAYLIST_LATITUDE + 2500 * ONE_METER_IN_LATITUDE_DEGREES,
    };

    await expect(useCase.execute(farInput)).rejects.toThrow(
      OutsidePlaylistZone,
    );
    expect(participantRepository.participants.size).toBe(0);
  });
});
