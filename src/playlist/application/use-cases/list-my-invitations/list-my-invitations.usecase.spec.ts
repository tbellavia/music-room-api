import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { InMemoryInvitationRepository } from 'src/playlist/infrastructure/persistence/invitation/in-memory-invitation.repository';
import { InMemoryAccountDirectory } from 'src/playlist/infrastructure/persistence/account/in-memory-account-directory';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { Invitation } from 'src/playlist/domain/invitation.entity';
import { ListMyInvitationsUseCase } from './list-my-invitations.usecase';

describe('ListMyInvitationsUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let invitationRepository: InMemoryInvitationRepository;
  let accountDirectory: InMemoryAccountDirectory;
  let useCase: ListMyInvitationsUseCase;

  async function givenInvitation(infos: {
    id: string;
    inviterId: string;
    inviteeId: string;
  }) {
    const invitation = Invitation.create({
      ...infos,
      playlistId: 'playlist-id',
    });
    await invitationRepository.save(invitation);
  }

  beforeEach(async () => {
    playlistRepository = new InMemoryPlaylistRepository();
    invitationRepository = new InMemoryInvitationRepository();
    accountDirectory = new InMemoryAccountDirectory();
    useCase = new ListMyInvitationsUseCase(
      playlistRepository,
      invitationRepository,
      accountDirectory,
    );

    const playlist = Playlist.create({
      id: 'playlist-id',
      type: PlaylistType.EDITOR,
      ownerId: 'owner-id',
      name: 'Road trip',
      description: '',
      latitude: 48.8966,
      longitude: 2.3184,
    });
    await playlistRepository.save(playlist);
    accountDirectory.add({ id: 'owner-id', username: 'owner' });
  });

  it('returns an empty list when nothing was received', async () => {
    const { invitations } = await useCase.execute({ accountId: 'user-id' });

    expect(invitations).toEqual([]);
  });

  it('returns the received invitations with the playlist and the inviter', async () => {
    await givenInvitation({
      id: 'invitation-id',
      inviterId: 'owner-id',
      inviteeId: 'user-id',
    });

    const { invitations } = await useCase.execute({ accountId: 'user-id' });

    expect(invitations).toEqual([
      {
        id: 'invitation-id',
        playlistId: 'playlist-id',
        playlistName: 'Road trip',
        playlistType: PlaylistType.EDITOR,
        inviterId: 'owner-id',
        inviterUsername: 'owner',
      },
    ]);
  });

  it('does not return invitations sent to other accounts', async () => {
    await givenInvitation({
      id: 'other-invitation-id',
      inviterId: 'owner-id',
      inviteeId: 'other-user-id',
    });

    const { invitations } = await useCase.execute({ accountId: 'user-id' });

    expect(invitations).toEqual([]);
  });

  it('does not return invitations sent by the user', async () => {
    await givenInvitation({
      id: 'sent-invitation-id',
      inviterId: 'user-id',
      inviteeId: 'other-user-id',
    });

    const { invitations } = await useCase.execute({ accountId: 'user-id' });

    expect(invitations).toEqual([]);
  });
});
