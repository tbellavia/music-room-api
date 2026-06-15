import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('friendships')
export class FriendshipOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  user_a_id: string;

  @Column()
  user_b_id: string;
}
