import { FriendshipRequest } from 'src/social/domain/friendship-request.entity';

export interface FriendshipRequestRepository {
  findByRequestAndSenderId(infos: {
    requestId: string;
    receiverId: string;
  }): Promise<FriendshipRequest | null>;
  findBySenderAndReceiverId(infos: {
    senderId: string;
    receiverId: string;
  }): Promise<FriendshipRequest | null>;
  delete(id: string): Promise<void>;
  save(request: FriendshipRequest): Promise<void>;
}

export const FRIENDSHIP_REQUEST_REPOSITORY = Symbol(
  'FriendshipRequestRepository',
);
