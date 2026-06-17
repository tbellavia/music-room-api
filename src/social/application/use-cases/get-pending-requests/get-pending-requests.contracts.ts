import { FriendshipRequest } from 'src/social/domain/friendship-request.entity';

export type GetPendingRequestsInput = {
  senderId: string;
};

export type GetPendingRequestsOutput = {
  requests: FriendshipRequest[];
};
