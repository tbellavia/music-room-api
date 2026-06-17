import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FriendshipRequestRepository } from 'src/social/application/ports/friendship-request.repository';
import { Repository } from 'typeorm';
import { FriendshipRequest } from 'src/social/domain/friendship-request.entity';
import { FriendshipRequestOrmEntity } from './typeorm-friendship-request.entity';

@Injectable()
export class TypeOrmFriendshipRequestRepository implements FriendshipRequestRepository {
  constructor(
    @InjectRepository(FriendshipRequestOrmEntity)
    private readonly repository: Repository<FriendshipRequestOrmEntity>,
  ) {}

  async save(request: FriendshipRequest): Promise<void> {
    await this.repository.save(this.toOrm(request));
  }

  private toOrm(request: FriendshipRequest): FriendshipRequestOrmEntity {
    return {
      id: request.id,
      senderId: request.senderId,
      receiverId: request.receiverId,
      accepted: request.accepted,
    };
  }

  private toDomain(orm: FriendshipRequestOrmEntity): FriendshipRequest {
    return new FriendshipRequest(
      orm.id,
      orm.senderId,
      orm.receiverId,
      orm.accepted,
    );
  }
}
