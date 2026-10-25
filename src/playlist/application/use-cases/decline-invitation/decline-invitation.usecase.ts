import { Inject, Injectable } from '@nestjs/common';
import {
  INVITATION_REPOSITORY,
  InvitationRepository,
} from '../../ports/invitation.repository';
import { DeclineInvitationInput } from './decline-invitation.contracts';
import { InvitationNotFound } from 'src/playlist/domain/errors/invitation-not-found.error';

@Injectable()
export class DeclineInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: InvitationRepository,
  ) {}

  async execute(input: DeclineInvitationInput): Promise<void> {
    const invitation = await this.invitationRepository.findById(
      input.invitationId,
    );
    if (!invitation || !invitation.isInvitee(input.accountId)) {
      throw new InvitationNotFound();
    }

    await this.invitationRepository.delete(invitation.id);
  }
}
