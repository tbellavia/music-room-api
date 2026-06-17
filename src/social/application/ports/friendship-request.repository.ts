import { FriendshipRequest } from 'src/social/domain/friendship-request.entity';

export interface FriendshipRequestRepository {
  save(request: FriendshipRequest): Promise<void>;
}

export const FRIENDSHIP_REQUEST_REPOSITORY = Symbol(
  'FriendshipRequestRepository',
);
