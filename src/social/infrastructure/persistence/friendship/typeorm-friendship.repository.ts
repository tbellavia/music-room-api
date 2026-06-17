import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FriendshipRepository } from 'src/social/application/ports/friendship.repository';
import { FriendshipOrmEntity } from './typeorm-friendship.entity';
import { Repository } from 'typeorm';
import { Friendship } from 'src/social/domain/friendship.entity';

@Injectable()
export class TypeOrmFriendshipRepository implements FriendshipRepository {
  constructor(
    @InjectRepository(FriendshipOrmEntity)
    private readonly repository: Repository<FriendshipOrmEntity>,
  ) {}

  async findAllByUserId(userId: string): Promise<Friendship[]> {
    const entities = await this.repository.find({
      where: [{ user_a_id: userId }, { user_b_id: userId }],
    });

    return entities.map((entity: FriendshipOrmEntity) => this.toDomain(entity));
  }

  async save(friendship: Friendship): Promise<void> {
    await this.repository.save(this.toOrm(friendship));
  }

  private toOrm(friendship: Friendship): FriendshipOrmEntity {
    return {
      id: friendship.id,
      user_a_id: friendship.userA,
      user_b_id: friendship.userB,
    };
  }

  private toDomain(orm: FriendshipOrmEntity): Friendship {
    return new Friendship(orm.id, orm.user_a_id, orm.user_b_id);
  }
}
