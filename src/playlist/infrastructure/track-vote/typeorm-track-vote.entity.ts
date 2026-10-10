import { AccountOrmEntity } from 'src/identity/infrastructure/persistence/typeorm-account.entity';
import { Column, Entity, OneToOne, PrimaryColumn, Relation } from 'typeorm';

@Entity('track-vote')
export class TrackVoteOrmEntity {
  @PrimaryColumn()
  id: string;

  @OneToOne(() => TrackVoteOrmEntity)
  playlist: Relation<TrackVoteOrmEntity>;

  @OneToOne(() => AccountOrmEntity)
  account: Relation<AccountOrmEntity>;

  // Max size of youtube video id is 11, but we put 11 to be sure
  @Column({ type: 'varchar', length: 12 })
  video_id: string;
}
