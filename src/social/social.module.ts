import { Module } from '@nestjs/common';
import { SocialController } from './interface/http/social.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendshipOrmEntity } from './infrastructure/persistence/friendship/typeorm-friendship.entity';
import { FRIENDSHIP_REPOSITORY } from './application/ports/friendship.repository';
import { TypeOrmFriendshipRepository } from './infrastructure/persistence/friendship/typeorm-friendship.repository';
import { FriendshipRequestOrmEntity } from './infrastructure/persistence/friendship-request/typeorm-friendship-request.entity';
import { FRIENDSHIP_REQUEST_REPOSITORY } from './application/ports/friendship-request.repository';
import { TypeOrmFriendshipRequestRepository } from './infrastructure/persistence/friendship-request/typeorm-friendship-request.repository';
import { RequestFriendshipUseCase } from './application/use-cases/request-friendship/request-friendship.usecase';
import { AcceptFriendshipUseCase } from './application/use-cases/accept-friendship/accept-friendship.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([FriendshipOrmEntity, FriendshipRequestOrmEntity]),
  ],
  controllers: [SocialController],
  providers: [
    {
      provide: FRIENDSHIP_REPOSITORY,
      useClass: TypeOrmFriendshipRepository,
    },
    {
      provide: FRIENDSHIP_REQUEST_REPOSITORY,
      useClass: TypeOrmFriendshipRequestRepository,
    },
    TypeOrmFriendshipRequestRepository,
    TypeOrmFriendshipRepository,
    RequestFriendshipUseCase,
    AcceptFriendshipUseCase,
  ],
})
export class SocialModule {}
