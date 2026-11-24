import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import { InMemoryInvitationRepository } from 'src/playlist/infrastructure/persistence/invitation/in-memory-invitation.repository';
import { InMemoryAccountDirectory } from 'src/playlist/infrastructure/persistence/account/in-memory-account-directory';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import { PlaylistRole } from 'src/playlist/domain/playlist-role.enum';
import { PlaylistStatus } from 'src/playlist/domain/playlist-status.enum';
import { Participant } from 'src/playlist/domain/participant.entity';
import { Invitation } from 'src/playlist/domain/invitation.entity';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotPlaylistMember } from 'src/playlist/domain/errors/not-playlist-member.error';
import { GetPlaylistUseCase } from './get-playlist.usecase';

const PARTY_PLACE = { latitude: 48.8966, longitude: 2.3184 };
// ~1.1 km north of the party
const FAR_AWAY = { latitude: 48.9066, longitude: 2.3184 };

describe('GetPlaylistUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let invitationRepository: InMemoryInvitationRepository;
  let accountDirectory: InMemoryAccountDirectory;
  let useCase: GetPlaylistUseCase;

  beforeEach(async () => {
    playlistRepository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    invitationRepository = new InMemoryInvitationRepository();
    accountDirectory = new InMemoryAccountDirectory();
    useCase = new GetPlaylistUseCase(
      playlistRepository,
      participantRepository,
      invitationRepository,
      accountDirectory,
    );

    await playlistRepository.save(
      Playlist.create({
        id: 'party-id',
        type: PlaylistType.VOTE,
        ownerId: 'owner-id',
        name: 'Soirée',
        description: 'Au 42',
        ...PARTY_PLACE,
        address: '96 boulevard Bessières, Paris',
      }),
    );
    await playlistRepository.save(
      Playlist.create({
        id: 'private-id',
        type: PlaylistType.EDITOR,
        ownerId: 'owner-id',
        name: 'Projet',
        description: '',
        isPrivate: true,
        license: PlaylistLicense.INVITED_ONLY,
      }),
    );
    accountDirectory.add({ id: 'owner-id', username: 'owner' });

    const member = new Participant(
      'member-participant-id',
      'party-id',
      'member-id',
      true,
      JoinMethod.JOIN,
    );
    await participantRepository.save(member);
  });

  it('returns the playlist in the format of the lists', async () => {
    const playlist = await useCase.execute({
      playlistId: 'party-id',
      accountId: 'stranger-id',
      position: null,
    });

    const { createdAt, ...fields } = playlist;
    expect(createdAt).toBeInstanceOf(Date);
    expect(fields).toEqual({
      id: 'party-id',
      type: PlaylistType.VOTE,
      license: PlaylistLicense.EVERYONE,
      ownerId: 'owner-id',
      ownerUsername: 'owner',
      name: 'Soirée',
      description: 'Au 42',
      isPrivate: false,
      beginAt: null,
      endAt: null,
      latitude: PARTY_PLACE.latitude,
      longitude: PARTY_PLACE.longitude,
      address: '96 boulevard Bessières, Paris',
      coverPath: null,
      status: PlaylistStatus.LIVE,
      role: null,
      hasPrivilege: false,
      distanceMeters: null,
      canJoinHere: false,
    });
  });

  it('gives the role of the owner', async () => {
    const playlist = await useCase.execute({
      playlistId: 'party-id',
      accountId: 'owner-id',
      position: null,
    });

    expect(playlist.role).toBe(PlaylistRole.OWNER);
    expect(playlist.hasPrivilege).toBe(true);
  });

  it('gives the role and the privilege of a participant', async () => {
    const playlist = await useCase.execute({
      playlistId: 'party-id',
      accountId: 'member-id',
      position: null,
    });

    expect(playlist.role).toBe(PlaylistRole.PARTICIPANT);
    expect(playlist.hasPrivilege).toBe(true);
  });

  describe('with a position', () => {
    it('lets a stranger on site join', async () => {
      const playlist = await useCase.execute({
        playlistId: 'party-id',
        accountId: 'stranger-id',
        position: PARTY_PLACE,
      });

      expect(playlist.distanceMeters).toBe(0);
      expect(playlist.canJoinHere).toBe(true);
    });

    it('does not let a stranger too far away join', async () => {
      const playlist = await useCase.execute({
        playlistId: 'party-id',
        accountId: 'stranger-id',
        position: FAR_AWAY,
      });

      expect(playlist.distanceMeters).toBeGreaterThan(1000);
      expect(playlist.canJoinHere).toBe(false);
    });

    it('never lets a member join again', async () => {
      const playlist = await useCase.execute({
        playlistId: 'party-id',
        accountId: 'member-id',
        position: PARTY_PLACE,
      });

      expect(playlist.canJoinHere).toBe(false);
    });
  });

  describe('a private playlist', () => {
    it('can be seen by its owner', async () => {
      const playlist = await useCase.execute({
        playlistId: 'private-id',
        accountId: 'owner-id',
        position: null,
      });

      expect(playlist.id).toBe('private-id');
    });

    it('can be seen by an invitee who has not accepted yet', async () => {
      await invitationRepository.save(
        Invitation.create({
          id: 'invitation-id',
          playlistId: 'private-id',
          inviterId: 'owner-id',
          inviteeId: 'invitee-id',
        }),
      );

      const playlist = await useCase.execute({
        playlistId: 'private-id',
        accountId: 'invitee-id',
        position: null,
      });

      expect(playlist.id).toBe('private-id');
      expect(playlist.role).toBeNull();
    });

    it('cannot be seen by a stranger', async () => {
      await expect(
        useCase.execute({
          playlistId: 'private-id',
          accountId: 'stranger-id',
          position: null,
        }),
      ).rejects.toThrow(NotPlaylistMember);
    });

    it('cannot be seen with the invitation to another playlist', async () => {
      await invitationRepository.save(
        Invitation.create({
          id: 'invitation-id',
          playlistId: 'party-id',
          inviterId: 'owner-id',
          inviteeId: 'invitee-id',
        }),
      );

      await expect(
        useCase.execute({
          playlistId: 'private-id',
          accountId: 'invitee-id',
          position: null,
        }),
      ).rejects.toThrow(NotPlaylistMember);
    });
  });

  it('throws when the playlist does not exist', async () => {
    await expect(
      useCase.execute({
        playlistId: 'unknown-id',
        accountId: 'owner-id',
        position: null,
      }),
    ).rejects.toThrow(PlaylistNotFound);
  });
});
