import { AccountOrmEntity } from 'src/identity/infrastructure/persistence/typeorm-account.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

// Deleting an account deletes the requests it sent or received
@Entity('friendship-request')
export class FriendshipRequestOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  senderId: string;

  @ManyToOne(() => AccountOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender?: Relation<AccountOrmEntity>;

  @Column()
  receiverId: string;

  @ManyToOne(() => AccountOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiverId' })
  receiver?: Relation<AccountOrmEntity>;
}
