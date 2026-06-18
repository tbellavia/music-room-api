import { Inject, Injectable } from '@nestjs/common';
import { CancelFriendshipRequestInput } from './cancel-friendship-request.contracts';
import {
  FRIENDSHIP_REQUEST_REPOSITORY,
  FriendshipRequestRepository,
} from '../../ports/friendship-request.repository';
import { FriendshipRequestNotFound } from 'src/social/domain/errors/friendship-request-not-found.error';

@Injectable()
export class CancelFriendshipRequestUseCase {
  constructor(
    @Inject(FRIENDSHIP_REQUEST_REPOSITORY)
    private readonly repository: FriendshipRequestRepository,
  ) {}

  async execute(input: CancelFriendshipRequestInput): Promise<void> {
    const request = await this.repository.findByRequestAndSenderId({
      requestId: input.requestId,
      senderId: input.senderId,
    });

    if (!request) {
      throw new FriendshipRequestNotFound();
    }
    await this.repository.delete(request.id);
  }
}
