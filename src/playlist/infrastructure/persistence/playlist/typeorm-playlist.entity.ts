import { AccountOrmEntity } from 'src/identity/infrastructure/persistence/typeorm-account.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
  Unique,
} from 'typeorm';

@Entity('playlists')
@Unique(['owner_id', 'name'])
export class PlaylistOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column({ type: 'enum', enum: PlaylistType })
  type: PlaylistType;

  @Column()
  owner_id: string;

  @ManyToOne(() => AccountOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner?: Relation<AccountOrmEntity>;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'boolean', default: false })
  is_private: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  begin_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  end_at: Date | null;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  cover_path: string | null;
}
