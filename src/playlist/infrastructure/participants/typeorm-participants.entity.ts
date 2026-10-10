import {
  Column,
  Entity,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { TrackVotePlaylistOrmEntity } from '../track-vote-playlist/typeorm-track-vote-playlist.entity';
import { TrackEditorPlaylistOrmEntity } from '../track-editor-playlist/typeorm-track-editor-playlist.entity';
import { AccountOrmEntity } from 'src/identity/infrastructure/persistence/typeorm-account.entity';

@Entity('participants')
export class ParticipantsOrmEntity {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => TrackVotePlaylistOrmEntity)
  track_vote_playlist: Relation<TrackVotePlaylistOrmEntity>;

  @ManyToOne(() => TrackEditorPlaylistOrmEntity)
  track_editor_playlist: Relation<TrackEditorPlaylistOrmEntity>;

  @OneToOne(() => AccountOrmEntity)
  account: Relation<AccountOrmEntity>;

  @Column()
  has_privilege: boolean;
}
