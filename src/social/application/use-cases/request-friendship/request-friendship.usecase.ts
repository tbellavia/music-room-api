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
import { FriendshipRequestAlreadyExists } from 'src/social/domain/errors/friendship-request-already-exists.error';
import {
  FRIENDSHIP_REPOSITORY,
  FriendshipRepository,
} from '../../ports/friendship.repository';
import { FriendshipAlreadyExists } from 'src/social/domain/errors/friendship-already-exists.error';

@Injectable()
export class RequestFriendshipUseCase {
  constructor(
    @Inject(FRIENDSHIP_REQUEST_REPOSITORY)
    private readonly requestRepository: FriendshipRequestRepository,
    @Inject(FRIENDSHIP_REPOSITORY)
    private readonly friendshipRepository: FriendshipRepository,
  ) {}

  async execute(
    input: RequestFriendshipInput,
  ): Promise<RequestFriendshipOutput> {
    if (input.senderId == input.receiverId) {
      throw new SelfFriendshipRequestError();
    }

    await this.throwExistingRequest(input);
    await this.throwExistingFriendship(input);

    const request = FriendshipRequest.create({
      id: randomUUID(),
      senderId: input.senderId,
      receiverId: input.receiverId,
    });

    await this.requestRepository.save(request);

    return {
      requestId: request.id,
    };
  }

  private async throwExistingRequest(input: RequestFriendshipInput) {
    const request = await this.requestRepository.findBySenderAndReceiverId({
      receiverId: input.receiverId,
      senderId: input.senderId,
    });
    if (request) {
      throw new FriendshipRequestAlreadyExists();
    }
  }

  private async throwExistingFriendship(input: RequestFriendshipInput) {
    const friendship = await this.friendshipRepository.findByUsersId({
      userA: input.senderId,
      userB: input.receiverId,
    });
    if (friendship) {
      throw new FriendshipAlreadyExists();
    }
  }
}
