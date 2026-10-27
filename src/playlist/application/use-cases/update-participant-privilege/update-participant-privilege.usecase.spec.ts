import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { Participant } from 'src/playlist/domain/participant.entity';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotPlaylistOwner } from 'src/playlist/domain/errors/not-playlist-owner.error';
import { ParticipantNotFound } from 'src/playlist/domain/errors/participant-not-found.error';
import { UpdateParticipantPrivilegeUseCase } from './update-participant-privilege.usecase';
import { UpdateParticipantPrivilegeInput } from './update-participant-privilege.contracts';

const grantInput: UpdateParticipantPrivilegeInput = {
  playlistId: 'playlist-id',
  participantId: 'member-participant-id',
  accountId: 'owner-id',
  hasPrivilege: true,
};

describe('UpdateParticipantPrivilegeUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let useCase: UpdateParticipantPrivilegeUseCase;

  async function readMemberPrivilege() {
    const member = await participantRepository.findById(
      'member-participant-id',
    );
    expect(member).not.toBeNull();
    return member?.hasPrivilege;
  }

  beforeEach(async () => {
    playlistRepository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    useCase = new UpdateParticipantPrivilegeUseCase(
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

    const member = Participant.create({
      id: 'member-participant-id',
      playlistId: 'playlist-id',
      accountId: 'member-id',
      joinedVia: JoinMethod.JOIN,
    });
    await participantRepository.save(member);
  });

  it('grants the privilege', async () => {
    await useCase.execute(grantInput);

    const hasPrivilege = await readMemberPrivilege();
    expect(hasPrivilege).toBe(true);
  });

  it('revokes the privilege', async () => {
    await useCase.execute(grantInput);
    await useCase.execute({ ...grantInput, hasPrivilege: false });

    const hasPrivilege = await readMemberPrivilege();
    expect(hasPrivilege).toBe(false);
  });

  it('is reserved to the owner', async () => {
    const memberInput = { ...grantInput, accountId: 'member-id' };

    await expect(useCase.execute(memberInput)).rejects.toThrow(
      NotPlaylistOwner,
    );
    const hasPrivilege = await readMemberPrivilege();
    expect(hasPrivilege).toBe(false);
  });

  it('rejects an unknown participant', async () => {
    const unknownInput = { ...grantInput, participantId: 'unknown-id' };

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

    const otherInput = { ...grantInput, participantId: 'other-participant-id' };

    await expect(useCase.execute(otherInput)).rejects.toThrow(
      ParticipantNotFound,
    );
  });

  it('rejects an unknown playlist', async () => {
    const unknownInput = { ...grantInput, playlistId: 'unknown-id' };

    await expect(useCase.execute(unknownInput)).rejects.toThrow(
      PlaylistNotFound,
    );
  });
});
