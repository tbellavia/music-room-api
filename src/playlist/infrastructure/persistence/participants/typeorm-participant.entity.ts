import { AccountOrmEntity } from "src/identity/infrastructure/persistence/typeorm-account.entity";
import { Entity, ManyToOne, OneToMany, OneToOne, PrimaryColumn, Relation } from "typeorm";
import { PlaylistOrmEntity } from "../playlist/typeorm-playlist.entity";

@Entity('participants')
export class PlaylistParticipantOrmEntity {
  @PrimaryColumn()
  id: string;

  @OneToOne(() => AccountOrmEntity)
  user: AccountOrmEntity;

  @ManyToOne(() => PlaylistOrmEntity, (playlist) => playlist.participants)
  playlist: Relation<PlaylistOrmEntity>;
}
