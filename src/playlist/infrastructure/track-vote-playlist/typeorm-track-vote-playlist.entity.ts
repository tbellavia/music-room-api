import { Column, Entity, OneToMany, OneToOne, PrimaryColumn, Relation } from 'typeorm';
import { ParticipantsOrmEntity } from '../participants/typeorm-participants.entity';
import { AccountOrmEntity } from 'src/identity/infrastructure/persistence/typeorm-account.entity';

@Entity('track-vote-playlist')
export class TrackVotePlaylistOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column({ type: 'varchar', length: '100' })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'boolean' })
  visibility: boolean;

  @Column({ type: 'date' })
  begin: Date;

  @Column({ type: 'date' })
  end: Date;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @Column({ type: 'varchar', length: '2048' })
  cover_path: string;

  @OneToOne(() => AccountOrmEntity)
  creator: Relation<AccountOrmEntity>;

  @OneToMany(
    () => ParticipantsOrmEntity,
    (participant: ParticipantsOrmEntity) => participant.track_vote_playlist,
  )
  participants: Relation<ParticipantsOrmEntity[]>;
}
