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

@Entity('playlist_invitations')
@Unique(['playlist_id', 'invitee_id'])
export class InvitationOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  playlist_id: string;

  @ManyToOne(() => PlaylistOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_id' })
  playlist?: Relation<PlaylistOrmEntity>;

  @Column()
  inviter_id: string;

  @ManyToOne(() => AccountOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inviter_id' })
  inviter?: Relation<AccountOrmEntity>;

  @Column()
  invitee_id: string;

  @ManyToOne(() => AccountOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitee_id' })
  invitee?: Relation<AccountOrmEntity>;
}
