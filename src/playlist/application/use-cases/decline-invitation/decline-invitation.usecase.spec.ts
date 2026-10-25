import { InMemoryInvitationRepository } from 'src/playlist/infrastructure/persistence/invitation/in-memory-invitation.repository';
import { Invitation } from 'src/playlist/domain/invitation.entity';
import { InvitationNotFound } from 'src/playlist/domain/errors/invitation-not-found.error';
import { DeclineInvitationUseCase } from './decline-invitation.usecase';
import { DeclineInvitationInput } from './decline-invitation.contracts';

const input: DeclineInvitationInput = {
  invitationId: 'invitation-id',
  accountId: 'invitee-id',
};

describe('DeclineInvitationUseCase', () => {
  let invitationRepository: InMemoryInvitationRepository;
  let useCase: DeclineInvitationUseCase;

  beforeEach(async () => {
    invitationRepository = new InMemoryInvitationRepository();
    useCase = new DeclineInvitationUseCase(invitationRepository);

    const invitation = Invitation.create({
      id: 'invitation-id',
      playlistId: 'playlist-id',
      inviterId: 'owner-id',
      inviteeId: 'invitee-id',
    });
    await invitationRepository.save(invitation);
  });

  it('deletes the invitation', async () => {
    await useCase.execute(input);

    expect(invitationRepository.invitations.has('invitation-id')).toBe(false);
  });

  it('does not let the inviter decline it', async () => {
    const inviterInput = { ...input, accountId: 'owner-id' };

    await expect(useCase.execute(inviterInput)).rejects.toThrow(
      InvitationNotFound,
    );
    expect(invitationRepository.invitations.has('invitation-id')).toBe(true);
  });

  it('rejects an unknown invitation', async () => {
    const unknownInput = { ...input, invitationId: 'unknown-id' };

    await expect(useCase.execute(unknownInput)).rejects.toThrow(
      InvitationNotFound,
    );
  });
});
