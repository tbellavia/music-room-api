import { Inject, Injectable } from '@nestjs/common';
import {
  RequestFriendshipInput,
  RequestFriendshipOutput,
} from './request-friendship.contracts';
import {
  FRIENDSHIP_REQUEST_REPOSITORY,
  FriendshipRequestRepository,
} from '../../ports/friendship-request.repository';
import { FriendshipRequest } from 'src/social/domain/friendship-request.entity';
import { randomUUID } from 'crypto';
import { SelfFriendshipRequestError } from 'src/social/domain/errors/self-friendship-request.error';

@Injectable()
export class RequestFriendshipUseCase {
  constructor(
    @Inject(FRIENDSHIP_REQUEST_REPOSITORY)
    private readonly repository: FriendshipRequestRepository,
  ) {}

  async execute(
    input: RequestFriendshipInput,
  ): Promise<RequestFriendshipOutput> {
    if (input.senderId == input.receiverId) {
      throw new SelfFriendshipRequestError();
    }

    const request = FriendshipRequest.create({
      id: randomUUID(),
      senderId: input.senderId,
      receiverId: input.receiverId,
    });

    await this.repository.save(request);

    return {
      requestId: request.id,
    };
  }
}
