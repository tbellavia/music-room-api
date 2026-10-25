import { InMemoryInvitationRepository } from 'src/playlist/infrastructure/persistence/invitation/in-memory-invitation.repository';
import { Invitation } from 'src/playlist/domain/invitation.entity';
import { InvitationNotFound } from 'src/playlist/domain/errors/invitation-not-found.error';
import { CancelInvitationUseCase } from './cancel-invitation.usecase';
import { CancelInvitationInput } from './cancel-invitation.contracts';

const input: CancelInvitationInput = {
  invitationId: 'invitation-id',
  accountId: 'inviter-id',
};

describe('CancelInvitationUseCase', () => {
  let invitationRepository: InMemoryInvitationRepository;
  let useCase: CancelInvitationUseCase;

  beforeEach(async () => {
    invitationRepository = new InMemoryInvitationRepository();
    useCase = new CancelInvitationUseCase(invitationRepository);

    const invitation = Invitation.create({
      id: 'invitation-id',
      playlistId: 'playlist-id',
      inviterId: 'inviter-id',
      inviteeId: 'invitee-id',
    });
    await invitationRepository.save(invitation);
  });

  it('deletes the invitation', async () => {
    await useCase.execute(input);

    expect(invitationRepository.invitations.has('invitation-id')).toBe(false);
  });

  it('does not let the invitee cancel it', async () => {
    const inviteeInput = { ...input, accountId: 'invitee-id' };

    await expect(useCase.execute(inviteeInput)).rejects.toThrow(
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
