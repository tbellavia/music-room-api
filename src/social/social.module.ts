import { Module } from '@nestjs/common';
import { SocialController } from './interface/http/social.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendshipOrmEntity } from './infrastructure/persistence/typeorm-friendship.entity';
import { FRIENDSHIP_REPOSITORY } from './application/ports/friendship.repository';
import { TypeOrmFriendshipRepository } from './infrastructure/persistence/typeorm-friendship.repository';

@Module({
  imports: [TypeOrmModule.forFeature([FriendshipOrmEntity])],
  controllers: [SocialController],
  providers: [
    {
      provide: FRIENDSHIP_REPOSITORY,
      useClass: TypeOrmFriendshipRepository,
    },
  ],
})
export class SocialModule {}
