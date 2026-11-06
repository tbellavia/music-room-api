import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  INVITATION_REPOSITORY,
  InvitationRepository,
} from '../../ports/invitation.repository';
import { CancelInvitationInput } from './cancel-invitation.contracts';
import { InvitationNotFound } from 'src/playlist/domain/errors/invitation-not-found.error';

@Injectable()
export class CancelInvitationUseCase {
  private readonly logger = new Logger(CancelInvitationUseCase.name);

  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: InvitationRepository,
  ) {}

  async execute(input: CancelInvitationInput): Promise<void> {
    const invitation = await this.invitationRepository.findById(
      input.invitationId,
    );
    // Only the inviter can cancel: for anyone else the invitation does not exist
    if (!invitation || !invitation.isInviter(input.accountId)) {
      throw new InvitationNotFound();
    }

    await this.invitationRepository.delete(invitation.id);
    this.logger.log(
      `Invitation cancelled invitation=${invitation.id} by=${input.accountId}`,
    );
  }
}
