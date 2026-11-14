import { AccountOrmEntity } from 'src/identity/infrastructure/persistence/typeorm-account.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

// Deleting an account deletes its friendships
@Entity('friendships')
export class FriendshipOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  user_a_id: string;

  @ManyToOne(() => AccountOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_a_id' })
  userA?: Relation<AccountOrmEntity>;

  @Column()
  user_b_id: string;

  @ManyToOne(() => AccountOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_b_id' })
  userB?: Relation<AccountOrmEntity>;
}
