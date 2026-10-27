import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import { InMemoryInvitationRepository } from 'src/playlist/infrastructure/persistence/invitation/in-memory-invitation.repository';
import {
  CreatePlaylistInfos,
  Playlist,
} from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { Participant } from 'src/playlist/domain/participant.entity';
import { Invitation } from 'src/playlist/domain/invitation.entity';
import { InvitationNotFound } from 'src/playlist/domain/errors/invitation-not-found.error';
import { PlaylistEnded } from 'src/playlist/domain/errors/playlist-ended.error';
import { AlreadyParticipant } from 'src/playlist/domain/errors/already-participant.error';
import { AcceptInvitationUseCase } from './accept-invitation.usecase';
import { AcceptInvitationInput } from './accept-invitation.contracts';

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

const input: AcceptInvitationInput = {
  invitationId: 'invitation-id',
  accountId: 'invitee-id',
};

describe('AcceptInvitationUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let invitationRepository: InMemoryInvitationRepository;
  let useCase: AcceptInvitationUseCase;

  async function givenPlaylist(overrides: Partial<CreatePlaylistInfos> = {}) {
    const playlist = Playlist.create({ ...defaultInfos, ...overrides });
    await playlistRepository.save(playlist);
  }

  beforeEach(async () => {
    playlistRepository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    invitationRepository = new InMemoryInvitationRepository();
    useCase = new AcceptInvitationUseCase(
      playlistRepository,
      participantRepository,
      invitationRepository,
    );

    const invitation = Invitation.create({
      id: 'invitation-id',
      playlistId: 'playlist-id',
      inviterId: 'owner-id',
      inviteeId: 'invitee-id',
    });
    await invitationRepository.save(invitation);
  });

  it('adds the invitee as a participant without privilege', async () => {
    await givenPlaylist();

    const { participantId } = await useCase.execute(input);

    const participant = participantRepository.participants.get(participantId);
    expect(participant).toBeDefined();
    expect(participant?.playlistId).toBe('playlist-id');
    expect(participant?.accountId).toBe('invitee-id');
    expect(participant?.hasPrivilege).toBe(false);
  });

  // Used by the INVITED_ONLY license
  it('records that the participant was invited', async () => {
    await givenPlaylist();

    const { participantId } = await useCase.execute(input);

    const participant = participantRepository.participants.get(participantId);
    expect(participant?.joinedVia).toBe(JoinMethod.INVITATION);
  });

  it('deletes the accepted invitation', async () => {
    await givenPlaylist();

    await useCase.execute(input);

    expect(invitationRepository.invitations.has('invitation-id')).toBe(false);
  });

  it('can be accepted before the playlist starts', async () => {
    await givenPlaylist({ beginAt: new Date('2999-01-01') });

    await useCase.execute(input);

    expect(participantRepository.participants.size).toBe(1);
  });

  it('rejects an unknown invitation', async () => {
    await givenPlaylist();

    const unknownInput = { ...input, invitationId: 'unknown-id' };

    await expect(useCase.execute(unknownInput)).rejects.toThrow(
      InvitationNotFound,
    );
  });

  it('does not let someone else accept the invitation', async () => {
    await givenPlaylist();

    const inviterInput = { ...input, accountId: 'owner-id' };

    await expect(useCase.execute(inviterInput)).rejects.toThrow(
      InvitationNotFound,
    );
    expect(participantRepository.participants.size).toBe(0);
    expect(invitationRepository.invitations.has('invitation-id')).toBe(true);
  });

  it('rejects an invitation to an ended playlist', async () => {
    await givenPlaylist({ endAt: new Date('2000-01-01') });

    await expect(useCase.execute(input)).rejects.toThrow(PlaylistEnded);
    expect(participantRepository.participants.size).toBe(0);
  });

  it('rejects an invitee who already joined in the meantime', async () => {
    await givenPlaylist();
    const existing = Participant.create({
      id: 'existing-participant-id',
      playlistId: 'playlist-id',
      accountId: 'invitee-id',
      joinedVia: JoinMethod.JOIN,
    });
    await participantRepository.save(existing);

    await expect(useCase.execute(input)).rejects.toThrow(AlreadyParticipant);
    expect(participantRepository.participants.size).toBe(1);
  });
});
