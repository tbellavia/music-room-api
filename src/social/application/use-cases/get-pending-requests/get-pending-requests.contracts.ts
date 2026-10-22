import { FriendshipRequest } from 'src/social/domain/friendship-request.entity';

export type GetPendingRequestsInput = {
  receiverId: string;
};

export type GetPendingRequestsOutput = {
  requests: FriendshipRequest[];
};
