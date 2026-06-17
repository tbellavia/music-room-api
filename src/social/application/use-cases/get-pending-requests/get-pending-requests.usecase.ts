import { Inject, Injectable } from '@nestjs/common';
import {
  FRIENDSHIP_REQUEST_REPOSITORY,
  FriendshipRequestRepository,
} from '../../ports/friendship-request.repository';
import {
  GetPendingRequestsInput,
  GetPendingRequestsOutput,
} from './get-pending-requests.contracts';

@Injectable()
export class GetPendingRequestsUseCase {
  constructor(
    @Inject(FRIENDSHIP_REQUEST_REPOSITORY)
    private readonly repository: FriendshipRequestRepository,
  ) {}

  async execute(
    input: GetPendingRequestsInput,
  ): Promise<GetPendingRequestsOutput> {
    const requests = await this.repository.findBySenderId(input.senderId);

    return {
      requests,
    };
  }
}
