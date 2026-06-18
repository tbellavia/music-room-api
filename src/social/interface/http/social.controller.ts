import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UserIdParam } from 'src/interface/http/decorators/user-param.decorator';
import { AcceptFriendshipUseCase } from 'src/social/application/use-cases/accept-friendship/accept-friendship.usecase';
import { CancelFriendshipRequestUseCase } from 'src/social/application/use-cases/cancel-friendship-request/cancel-friendship-request.usecase';
import { GetPendingRequestsUseCase } from 'src/social/application/use-cases/get-pending-requests/get-pending-requests.usecase';
import { RequestFriendshipUseCase } from 'src/social/application/use-cases/request-friendship/request-friendship.usecase';

@Controller('social')
export class SocialController {
  constructor(
    private readonly requestFriendship: RequestFriendshipUseCase,
    private readonly acceptFriendship: AcceptFriendshipUseCase,
    private readonly getPendingRequest: GetPendingRequestsUseCase,
    private readonly cancelFriendshipRequest: CancelFriendshipRequestUseCase,
  ) {}

  @Post('friends/request/:requestId/accept')
  async acceptFriendshipRequest(
    @UserIdParam() receiverId: string,
    @Param('requestId') requestId: string,
  ) {
    return await this.acceptFriendship.execute({
      requestId,
      receiverId,
    });
  }

  @Post('friends/request/:receiverId')
  async friendshipRequest(
    @UserIdParam() senderId: string,
    @Param('receiverId') receiverId: string,
  ) {
    return await this.requestFriendship.execute({
      senderId,
      receiverId,
    });
  }

  @Get('friends/request/pending')
  async pendingRequests(@UserIdParam() senderId: string) {
    return await this.getPendingRequest.execute({
      senderId,
    });
  }

  @Delete('friends/request/:requestId/cancel')
  async cancelRequest(
    @UserIdParam() senderId: string,
    @Param('requestId') requestId: string,
  ) {
    await this.cancelFriendshipRequest.execute({
      requestId,
      senderId,
    });
  }
}
