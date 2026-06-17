import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('friendship-request')
export class FriendshipRequestOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  senderId: string;

  @Column()
  receiverId: string;
}
