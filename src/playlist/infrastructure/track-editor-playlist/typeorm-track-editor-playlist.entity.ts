import { Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';
import { ParticipantsOrmEntity } from '../participants/typeorm-participants.entity';

@Entity('track-editor-playlist')
export class TrackEditorPlaylistOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column({ type: 'varchar', length: '100' })
  name: string;

  @Column({ type: 'varchar', length: '2048' })
  cover_path: string;

  @OneToMany(
    () => ParticipantsOrmEntity,
    (participant: ParticipantsOrmEntity) => participant.track_editor_playlist,
  )
  participants: Relation<ParticipantsOrmEntity[]>;
}
