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

  async findByRequestAndSenderId(infos: {
    requestId: string;
    receiverId: string;
  }): Promise<FriendshipRequest | null> {
    const entity = await this.repository.findOneBy({
      id: infos.requestId,
      receiverId: infos.receiverId,
    });

    if (!entity) {
      return null;
    }
    return this.toDomain(entity);
  }

  async findBySenderAndReceiverId(infos: {
    senderId: string;
    receiverId: string;
  }): Promise<FriendshipRequest | null> {
    const entity = await this.repository.findOneBy({
      senderId: infos.senderId,
      receiverId: infos.receiverId,
    });

    if (!entity) {
      return null;
    }
    return this.toDomain(entity);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async save(request: FriendshipRequest): Promise<void> {
    await this.repository.save(this.toOrm(request));
  }

  private toOrm(request: FriendshipRequest): FriendshipRequestOrmEntity {
    return {
      id: request.id,
      senderId: request.senderId,
      receiverId: request.receiverId,
    };
  }

  private toDomain(orm: FriendshipRequestOrmEntity): FriendshipRequest {
    return new FriendshipRequest(orm.id, orm.senderId, orm.receiverId);
  }
}
