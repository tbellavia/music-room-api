import { Participant } from 'src/playlist/domain/participant.entity';

export interface ParticipantRepository {
  findById(id: string): Promise<Participant | null>;
  findByPlaylistAndAccount(infos: {
    playlistId: string;
    accountId: string;
  }): Promise<Participant | null>;
  findByPlaylist(playlistId: string): Promise<Participant[]>;
  save(participant: Participant): Promise<void>;
  delete(id: string): Promise<void>;
}

export const PARTICIPANT_REPOSITORY = Symbol('ParticipantRepository');
