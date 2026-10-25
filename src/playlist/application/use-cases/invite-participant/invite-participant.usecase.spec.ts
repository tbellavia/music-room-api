import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import { InMemoryInvitationRepository } from 'src/playlist/infrastructure/persistence/invitation/in-memory-invitation.repository';
import { InMemoryAccountDirectory } from 'src/playlist/infrastructure/persistence/account/in-memory-account-directory';
import {
  CreatePlaylistInfos,
  Playlist,
} from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { Participant } from 'src/playlist/domain/participant.entity';
import { Invitation } from 'src/playlist/domain/invitation.entity';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { PlaylistEnded } from 'src/playlist/domain/errors/playlist-ended.error';
import { InvitationForbidden } from 'src/playlist/domain/errors/invitation-forbidden.error';
import { InviteeNotFound } from 'src/playlist/domain/errors/invitee-not-found.error';
import { AlreadyParticipant } from 'src/playlist/domain/errors/already-participant.error';
import { InvitationAlreadyExists } from 'src/playlist/domain/errors/invitation-already-exists.error';
import { InviteParticipantUseCase } from './invite-participant.usecase';
import { InviteParticipantInput } from './invite-participant.contracts';

const defaultInfos: CreatePlaylistInfos = {
  id: 'playlist-id',
  type: PlaylistType.VOTE,
  ownerId: 'owner-id',
  name: 'Soirée',
  description: '',
  isPrivate: true,
  latitude: 48.8966,
  longitude: 2.3184,
};

const ownerInput: InviteParticipantInput = {
  playlistId: 'playlist-id',
  inviterId: 'owner-id',
  inviteeId: 'invitee-id',
};

const privilegedInput: InviteParticipantInput = {
  playlistId: 'playlist-id',
  inviterId: 'privileged-id',
  inviteeId: 'invitee-id',
};

describe('InviteParticipantUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let invitationRepository: InMemoryInvitationRepository;
  let accountDirectory: InMemoryAccountDirectory;
  let useCase: InviteParticipantUseCase;

  async function givenPlaylist(overrides: Partial<CreatePlaylistInfos> = {}) {
    const playlist = Playlist.create({ ...defaultInfos, ...overrides });
    await playlistRepository.save(playlist);
  }

  async function givenParticipant(accountId: string, hasPrivilege: boolean) {
    const participant = new Participant(
      `${accountId}-participant`,
      'playlist-id',
      accountId,
      hasPrivilege,
    );
    await participantRepository.save(participant);
  }

  beforeEach(() => {
    playlistRepository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    invitationRepository = new InMemoryInvitationRepository();
    accountDirectory = new InMemoryAccountDirectory();
    useCase = new InviteParticipantUseCase(
      playlistRepository,
      participantRepository,
      invitationRepository,
      accountDirectory,
    );

    accountDirectory.add({ id: 'invitee-id', username: 'invitee' });
  });

  describe('as the owner', () => {
    it('creates a pending invitation', async () => {
      await givenPlaylist();

      const { invitationId } = await useCase.execute(ownerInput);

      const invitation = invitationRepository.invitations.get(invitationId);
      expect(invitation).toBeDefined();
      expect(invitation?.playlistId).toBe('playlist-id');
      expect(invitation?.inviterId).toBe('owner-id');
      expect(invitation?.inviteeId).toBe('invitee-id');
    });

    it('can invite before the playlist starts', async () => {
      await givenPlaylist({ beginAt: new Date('2999-01-01') });

      await useCase.execute(ownerInput);

      expect(invitationRepository.invitations.size).toBe(1);
    });

    it('can invite to a public playlist', async () => {
      await givenPlaylist({ isPrivate: false });

      await useCase.execute(ownerInput);

      expect(invitationRepository.invitations.size).toBe(1);
    });
  });

  describe('as a privileged participant', () => {
    it('creates a pending invitation', async () => {
      await givenPlaylist();
      await givenParticipant('privileged-id', true);

      const { invitationId } = await useCase.execute(privilegedInput);

      const invitation = invitationRepository.invitations.get(invitationId);
      expect(invitation?.inviterId).toBe('privileged-id');
    });

    // The on-site rule only applies to track actions, not to invitations
    it('can invite before the playlist starts', async () => {
      await givenPlaylist({ beginAt: new Date('2999-01-01') });
      await givenParticipant('privileged-id', true);

      await useCase.execute(privilegedInput);

      expect(invitationRepository.invitations.size).toBe(1);
    });
  });

  it('rejects a participant without privilege', async () => {
    await givenPlaylist();
    await givenParticipant('regular-id', false);

    const regularInput = { ...privilegedInput, inviterId: 'regular-id' };

    await expect(useCase.execute(regularInput)).rejects.toThrow(
      InvitationForbidden,
    );
    expect(invitationRepository.invitations.size).toBe(0);
  });

  it('rejects someone who is not a member', async () => {
    await givenPlaylist();

    const strangerInput = { ...privilegedInput, inviterId: 'stranger-id' };

    await expect(useCase.execute(strangerInput)).rejects.toThrow(
      InvitationForbidden,
    );
  });

  it('rejects an unknown playlist', async () => {
    await expect(useCase.execute(ownerInput)).rejects.toThrow(PlaylistNotFound);
  });

  it('rejects an ended playlist', async () => {
    await givenPlaylist({ endAt: new Date('2000-01-01') });

    await expect(useCase.execute(ownerInput)).rejects.toThrow(PlaylistEnded);
  });

  // The end date is the only time limit on invitations
  it('rejects a privileged participant once the playlist has ended', async () => {
    await givenPlaylist({ endAt: new Date('2000-01-01') });
    await givenParticipant('privileged-id', true);

    await expect(useCase.execute(privilegedInput)).rejects.toThrow(
      PlaylistEnded,
    );
    expect(invitationRepository.invitations.size).toBe(0);
  });

  it('rejects an unknown invitee', async () => {
    await givenPlaylist();

    const unknownInput = { ...ownerInput, inviteeId: 'unknown-id' };

    await expect(useCase.execute(unknownInput)).rejects.toThrow(
      InviteeNotFound,
    );
  });

  it('rejects inviting the owner', async () => {
    await givenPlaylist();
    accountDirectory.add({ id: 'owner-id', username: 'owner' });

    await givenParticipant('privileged-id', true);
    const inviteOwnerInput = { ...privilegedInput, inviteeId: 'owner-id' };

    await expect(useCase.execute(inviteOwnerInput)).rejects.toThrow(
      AlreadyParticipant,
    );
  });

  it('rejects inviting someone who is already a participant', async () => {
    await givenPlaylist();
    await givenParticipant('invitee-id', false);

    await expect(useCase.execute(ownerInput)).rejects.toThrow(
      AlreadyParticipant,
    );
  });

  it('rejects a second invitation for the same account', async () => {
    await givenPlaylist();
    const pendingInvitation = Invitation.create({
      id: 'pending-invitation-id',
      playlistId: 'playlist-id',
      inviterId: 'owner-id',
      inviteeId: 'invitee-id',
    });
    await invitationRepository.save(pendingInvitation);

    await expect(useCase.execute(ownerInput)).rejects.toThrow(
      InvitationAlreadyExists,
    );
    expect(invitationRepository.invitations.size).toBe(1);
  });
});
