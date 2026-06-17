import { Inject, Injectable } from '@nestjs/common';
import {
  FRIENDSHIP_REQUEST_REPOSITORY,
  FriendshipRequestRepository,
} from '../../ports/friendship-request.repository';
import {
  FRIENDSHIP_REPOSITORY,
  FriendshipRepository,
} from '../../ports/friendship.repository';
import { UnknownFriendshipRequest } from 'src/social/domain/errors/unknown-friendship-request';
import { Friendship } from 'src/social/domain/friendship.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class AcceptFriendshipUseCase {
  constructor(
    @Inject(FRIENDSHIP_REQUEST_REPOSITORY)
    private readonly requestRepository: FriendshipRequestRepository,
    @Inject(FRIENDSHIP_REPOSITORY)
    private readonly friendshipRepository: FriendshipRepository,
  ) {}

  async execute(input: AcceptFriendshipInput): Promise<AcceptFriendshipOutput> {
    const request = await this.requestRepository.findByRequestAndSenderId({
      requestId: input.requestId,
      receiverId: input.receiverId,
    });

    if (!request) {
      throw new UnknownFriendshipRequest();
    }
    await this.requestRepository.delete(request.id);

    const friendship = Friendship.create({
      id: randomUUID(),
      userA: request.senderId,
      userB: request.receiverId,
    });
    await this.friendshipRepository.save(friendship);

    return {
      friendshipId: friendship.id,
    };
  }
}
