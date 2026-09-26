import { Music } from "src/music/domain/music.entity";

export type PlaylistTrack = {
  userId: string;
  trackId: string;
  music: Music;
  private: boolean
}

export class Playlist {
  private id: string;
  private owner_id: string;
  private name: string;
  private participants: string[];
  private is_private: boolean;
  private tracks: PlaylistTrack[];

  constructor(
    id: string,
    owner_id: string,
    name: string,
    participants: string[],
    is_private: boolean,
    tracks: PlaylistTrack[]
  ) {
    this.id = id;
    this.owner_id = owner_id;
    this.name = name;
    this.participants = participants;
    this.is_private = is_private;
    this.tracks = tracks;
  }

  static create(infos: {
    id: string,
    owner_id: string,
    name: string,
    is_private: boolean,
    participants: string[],
  }): Playlist {
    return new Playlist(
      infos.id,
      infos.owner_id,
      infos.name,
      infos.participants,
      infos.is_private,
      []
    );
  }

  add_track(track: PlaylistTrack) {
    const found = this.tracks.find((track: PlaylistTrack) => track.trackId === track.trackId);

    if (found) {
      // TODO: replace with domain error
      throw new Error("Track already exists");
    }

    this.tracks.push(track);
  }

  remove_track(trackId: string) {
    this.tracks = this.tracks.filter((track: PlaylistTrack) => track.trackId !== trackId);
  }

  getTracks(): PlaylistTrack[] {
    return this.tracks;
  }

  addParticipant(participantId: string) {
    this.participants.push(participantId);
  }

  removeParticipant(participantId: string) {
    this.participants = this.participants.filter((participant: string) => participant !== participantId);
  }
}
