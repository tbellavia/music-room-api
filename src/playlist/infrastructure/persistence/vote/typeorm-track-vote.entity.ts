import { AccountOrmEntity } from 'src/identity/infrastructure/persistence/typeorm-account.entity';
import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { TrackOrmEntity } from '../track/typeorm-track.entity';

// The composite primary key guarantees one vote per account and per track,
// even when two votes arrive at the same time
@Entity('track_votes')
export class TrackVoteOrmEntity {
  @PrimaryColumn()
  track_id: string;

  @ManyToOne(() => TrackOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track?: Relation<TrackOrmEntity>;

  @PrimaryColumn()
  account_id: string;

  @ManyToOne(() => AccountOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account?: Relation<AccountOrmEntity>;
}
