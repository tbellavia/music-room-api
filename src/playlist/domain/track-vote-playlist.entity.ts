import { Participant } from './participants.entity';

export class TrackVotePlaylist {
  constructor(
    public id: string,
    public creatorId: string,
    public name: string,
    public description: string,
    public begin: Date,
    public end: Date,
    public latitude: number,
    public longitude: number,
    public cover_path: string,
    public participantIds: string[],
  ) {}

  static create(infos: {
    id: string;
    creatorId: string;
    name: string;
    description: string;
    begin: Date;
    end: Date;
    latitude: number;
    longitude: number;
    cover_path: string;
    participantIds: string[];
  }) {
    return new TrackVotePlaylist(
      infos.id,
      infos.creatorId,
      infos.name,
      infos.description,
      infos.begin,
      infos.end,
      infos.latitude,
      infos.longitude,
      infos.cover_path,
      infos.participantIds,
    );
  }
}
