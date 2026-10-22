import { AccountOrmEntity } from 'src/identity/infrastructure/persistence/typeorm-account.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
  Unique,
} from 'typeorm';
import { PlaylistOrmEntity } from '../playlist/typeorm-playlist.entity';

@Entity('participants')
@Unique(['playlist_id', 'account_id'])
export class ParticipantOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  playlist_id: string;

  @ManyToOne(() => PlaylistOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_id' })
  playlist?: Relation<PlaylistOrmEntity>;

  @Column()
  account_id: string;

  @ManyToOne(() => AccountOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account?: Relation<AccountOrmEntity>;

  @Column({ type: 'boolean', default: false })
  has_privilege: boolean;
}
