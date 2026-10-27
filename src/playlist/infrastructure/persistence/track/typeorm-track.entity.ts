import { AccountOrmEntity } from 'src/identity/infrastructure/persistence/typeorm-account.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { PlaylistOrmEntity } from '../playlist/typeorm-playlist.entity';

@Entity('tracks')
// A music can only be once in the waiting list, it can come back once played
@Index(['playlist_id', 'video_id'], {
  unique: true,
  where: 'played_at IS NULL',
})
export class TrackOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  playlist_id: string;

  @ManyToOne(() => PlaylistOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_id' })
  playlist?: Relation<PlaylistOrmEntity>;

  @Column({ type: 'varchar', length: 32 })
  video_id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  artist: string;

  @Column({ type: 'text', nullable: true })
  thumbnail: string | null;

  @Column({ type: 'integer', nullable: true })
  duration: number | null;

  @Column()
  added_by: string;

  @ManyToOne(() => AccountOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'added_by' })
  author?: Relation<AccountOrmEntity>;

  @Column({ type: 'timestamptz' })
  added_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  played_at: Date | null;
}
