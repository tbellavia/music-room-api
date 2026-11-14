import { AccountOrmEntity } from 'src/identity/infrastructure/persistence/typeorm-account.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
  Unique,
} from 'typeorm';

@Entity('playlists')
@Unique(['owner_id', 'name'])
// For the most recent playlists of an owner
@Index(['owner_id', 'created_at'])
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

  @Column({
    type: 'enum',
    enum: PlaylistLicense,
    default: PlaylistLicense.EVERYONE,
  })
  license: PlaylistLicense;

  // For the public events, sorted by beginning date
  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  begin_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  end_at: Date | null;

  // null for an EDITOR playlist
  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  // null for an EDITOR playlist, and for the VOTE playlists created before it existed
  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  cover_path: string | null;

  // Rows created before this column existed get the date of the migration
  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at: Date;
}
