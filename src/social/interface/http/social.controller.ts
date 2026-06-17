import { Controller, Param, Post } from '@nestjs/common';
import { UserIdParam } from 'src/interface/http/decorators/user-param.decorator';
import { AcceptFriendshipUseCase } from 'src/social/application/use-cases/accept-friendship/accept-friendship.usecase';
import { RequestFriendshipUseCase } from 'src/social/application/use-cases/request-friendship/request-friendship.usecase';

@Controller('social')
export class SocialController {
  constructor(
    private readonly requestFriendship: RequestFriendshipUseCase,
    private readonly acceptFriendship: AcceptFriendshipUseCase,
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
}
