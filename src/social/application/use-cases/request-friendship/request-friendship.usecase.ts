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

  // A pending request in either direction blocks a new one:
  // the receiver of an existing request must accept it instead
  private async throwExistingRequest(input: RequestFriendshipInput) {
    const sentRequest = await this.requestRepository.findBySenderAndReceiverId({
      senderId: input.senderId,
      receiverId: input.receiverId,
    });
    if (sentRequest) {
      throw new FriendshipRequestAlreadyExists();
    }

    const receivedRequest =
      await this.requestRepository.findBySenderAndReceiverId({
        senderId: input.receiverId,
        receiverId: input.senderId,
      });
    if (receivedRequest) {
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
