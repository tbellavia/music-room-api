import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { Participant } from 'src/playlist/domain/participant.entity';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotPlaylistOwner } from 'src/playlist/domain/errors/not-playlist-owner.error';
import { ParticipantNotFound } from 'src/playlist/domain/errors/participant-not-found.error';
import { RemoveParticipantUseCase } from './remove-participant.usecase';
import { RemoveParticipantInput } from './remove-participant.contracts';

const input: RemoveParticipantInput = {
  playlistId: 'playlist-id',
  participantId: 'member-participant-id',
  accountId: 'owner-id',
};

describe('RemoveParticipantUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let useCase: RemoveParticipantUseCase;

  beforeEach(async () => {
    playlistRepository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    useCase = new RemoveParticipantUseCase(
      playlistRepository,
      participantRepository,
    );

    const playlist = Playlist.create({
      id: 'playlist-id',
      type: PlaylistType.VOTE,
      ownerId: 'owner-id',
      name: 'Soirée',
      description: '',
      latitude: 48.8966,
      longitude: 2.3184,
    });
    await playlistRepository.save(playlist);

    // A privileged participant is still not allowed to remove others
    const member = new Participant(
      'member-participant-id',
      'playlist-id',
      'member-id',
      true,
      JoinMethod.JOIN,
    );
    await participantRepository.save(member);
  });

  it('removes the participant', async () => {
    await useCase.execute(input);

    expect(participantRepository.participants.size).toBe(0);
  });

  it('is reserved to the owner', async () => {
    const memberInput = { ...input, accountId: 'member-id' };

    await expect(useCase.execute(memberInput)).rejects.toThrow(
      NotPlaylistOwner,
    );
    expect(participantRepository.participants.size).toBe(1);
  });

  it('rejects an unknown participant', async () => {
    const unknownInput = { ...input, participantId: 'unknown-id' };

    await expect(useCase.execute(unknownInput)).rejects.toThrow(
      ParticipantNotFound,
    );
  });

  it('rejects a participant of another playlist', async () => {
    const otherPlaylistParticipant = Participant.create({
      id: 'other-participant-id',
      playlistId: 'other-playlist-id',
      accountId: 'other-id',
      joinedVia: JoinMethod.JOIN,
    });
    await participantRepository.save(otherPlaylistParticipant);

    const otherInput = { ...input, participantId: 'other-participant-id' };

    await expect(useCase.execute(otherInput)).rejects.toThrow(
      ParticipantNotFound,
    );
    expect(participantRepository.participants.size).toBe(2);
  });

  it('rejects an unknown playlist', async () => {
    const unknownInput = { ...input, playlistId: 'unknown-id' };

    await expect(useCase.execute(unknownInput)).rejects.toThrow(
      PlaylistNotFound,
    );
  });
});
