import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import {
  CreatePlaylistInfos,
  Playlist,
} from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { Participant } from 'src/playlist/domain/participant.entity';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { ParticipantNotFound } from 'src/playlist/domain/errors/participant-not-found.error';
import { LeavePlaylistUseCase } from './leave-playlist.usecase';
import { LeavePlaylistInput } from './leave-playlist.contracts';

const defaultInfos: CreatePlaylistInfos = {
  id: 'playlist-id',
  type: PlaylistType.VOTE,
  ownerId: 'owner-id',
  name: 'Soirée',
  description: '',
  latitude: 48.8966,
  longitude: 2.3184,
};

const input: LeavePlaylistInput = {
  playlistId: 'playlist-id',
  accountId: 'member-id',
};

describe('LeavePlaylistUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let useCase: LeavePlaylistUseCase;

  async function givenPlaylist(overrides: Partial<CreatePlaylistInfos> = {}) {
    const playlist = Playlist.create({ ...defaultInfos, ...overrides });
    await playlistRepository.save(playlist);
  }

  beforeEach(async () => {
    playlistRepository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    useCase = new LeavePlaylistUseCase(
      playlistRepository,
      participantRepository,
    );

    const member = Participant.create({
      id: 'member-participant-id',
      playlistId: 'playlist-id',
      accountId: 'member-id',
      joinedVia: JoinMethod.JOIN,
    });
    await participantRepository.save(member);
  });

  it('removes the caller from the participants', async () => {
    await givenPlaylist();

    await useCase.execute(input);

    expect(participantRepository.participants.size).toBe(0);
  });

  it('is allowed before the playlist starts', async () => {
    await givenPlaylist({ beginAt: new Date('2999-01-01') });

    await useCase.execute(input);

    expect(participantRepository.participants.size).toBe(0);
  });

  it('does not let the owner leave their playlist', async () => {
    await givenPlaylist();

    const ownerInput = { ...input, accountId: 'owner-id' };

    await expect(useCase.execute(ownerInput)).rejects.toThrow(
      ParticipantNotFound,
    );
  });

  it('rejects someone who is not a participant', async () => {
    await givenPlaylist();

    const strangerInput = { ...input, accountId: 'stranger-id' };

    await expect(useCase.execute(strangerInput)).rejects.toThrow(
      ParticipantNotFound,
    );
    expect(participantRepository.participants.size).toBe(1);
  });

  it('rejects an unknown playlist', async () => {
    await expect(useCase.execute(input)).rejects.toThrow(PlaylistNotFound);
  });
});
