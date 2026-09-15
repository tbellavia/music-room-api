import { AccountOrmEntity } from "src/identity/infrastructure/persistence/typeorm-account.entity";
import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryColumn } from "typeorm";
import { PlaylistParticipantOrmEntity } from "../participants/typeorm-participant.entity";

@Entity('playlists')
export class PlaylistOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @OneToOne(() => AccountOrmEntity)
  @JoinColumn()
  owner: AccountOrmEntity;

  @OneToMany(() => PlaylistParticipantOrmEntity, (participant) => participant.playlist)
  participants: PlaylistParticipantOrmEntity[];

  @Column({type: 'simple-json'})
  musics: Array<{
    name: string;
    videoId: string;
    artist: string;
    thumbnail: string | null;
    duration: number;
  }>
}
