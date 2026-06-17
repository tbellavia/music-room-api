import { Controller, Param, Post } from '@nestjs/common';
import { UserIdParam } from 'src/interface/http/decorators/user-param.decorator';
import { RequestFriendshipUseCase } from 'src/social/application/use-cases/request-friendship/request-friendship.usecase';

@Controller('social')
export class SocialController {
  constructor(private readonly requestFriendship: RequestFriendshipUseCase) {}

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
