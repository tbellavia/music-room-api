import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import { InMemoryAccountDirectory } from 'src/playlist/infrastructure/persistence/account/in-memory-account-directory';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { Participant } from 'src/playlist/domain/participant.entity';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotPlaylistMember } from 'src/playlist/domain/errors/not-playlist-member.error';
import { ListParticipantsUseCase } from './list-participants.usecase';

describe('ListParticipantsUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let accountDirectory: InMemoryAccountDirectory;
  let useCase: ListParticipantsUseCase;

  beforeEach(async () => {
    playlistRepository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    accountDirectory = new InMemoryAccountDirectory();
    useCase = new ListParticipantsUseCase(
      playlistRepository,
      participantRepository,
      accountDirectory,
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
    accountDirectory.add({ id: 'owner-id', username: 'owner' });
    accountDirectory.add({ id: 'member-id', username: 'member' });

    const member = new Participant(
      'member-participant-id',
      'playlist-id',
      'member-id',
      true,
      JoinMethod.JOIN,
    );
    await participantRepository.save(member);
  });

  it('returns the owner and the participants with their username', async () => {
    const result = await useCase.execute({
      playlistId: 'playlist-id',
      accountId: 'owner-id',
    });

    expect(result).toEqual({
      owner: { accountId: 'owner-id', username: 'owner' },
      participants: [
        {
          participantId: 'member-participant-id',
          accountId: 'member-id',
          username: 'member',
          hasPrivilege: true,
        },
      ],
    });
  });

  it('can be read by a participant', async () => {
    const result = await useCase.execute({
      playlistId: 'playlist-id',
      accountId: 'member-id',
    });

    expect(result.participants).toHaveLength(1);
  });

  it('does not return participants of another playlist', async () => {
    const otherPlaylistParticipant = new Participant(
      'other-participant-id',
      'other-playlist-id',
      'other-id',
      false,
      JoinMethod.JOIN,
    );
    await participantRepository.save(otherPlaylistParticipant);

    const result = await useCase.execute({
      playlistId: 'playlist-id',
      accountId: 'owner-id',
    });

    const participantIds = result.participants.map(
      (participant) => participant.participantId,
    );
    expect(participantIds).toEqual(['member-participant-id']);
  });

  it('rejects someone who is not a member', async () => {
    await expect(
      useCase.execute({ playlistId: 'playlist-id', accountId: 'stranger-id' }),
    ).rejects.toThrow(NotPlaylistMember);
  });

  it('rejects an unknown playlist', async () => {
    await expect(
      useCase.execute({ playlistId: 'unknown-id', accountId: 'owner-id' }),
    ).rejects.toThrow(PlaylistNotFound);
  });
});
