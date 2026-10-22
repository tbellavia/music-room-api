import { Participant } from 'src/playlist/domain/participant.entity';

export interface ParticipantRepository {
  findByPlaylistAndAccount(infos: {
    playlistId: string;
    accountId: string;
  }): Promise<Participant | null>;
  save(participant: Participant): Promise<void>;
}

export const PARTICIPANT_REPOSITORY = Symbol('ParticipantRepository');
