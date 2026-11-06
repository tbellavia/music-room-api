import { Inject, Injectable, Logger } from '@nestjs/common';
import { RejectFriendshipInput } from './reject-friendship.contracts';
import {
  FRIENDSHIP_REQUEST_REPOSITORY,
  FriendshipRequestRepository,
} from '../../ports/friendship-request.repository';
import { FriendshipRequestNotFound } from 'src/social/domain/errors/friendship-request-not-found.error';

@Injectable()
export class RejectFriendshipUseCase {
  private readonly logger = new Logger(RejectFriendshipUseCase.name);

  constructor(
    @Inject(FRIENDSHIP_REQUEST_REPOSITORY)
    private readonly repository: FriendshipRequestRepository,
  ) {}

  async execute(input: RejectFriendshipInput): Promise<void> {
    const request = await this.repository.findByRequestAndReceiverId({
      requestId: input.requestId,
      receiverId: input.receiverId,
    });

    if (!request) {
      throw new FriendshipRequestNotFound();
    }
    await this.repository.delete(request.id);
    this.logger.log(
      `Friendship request rejected request=${request.id} by=${input.receiverId}`,
    );
  }
}
