import { ParticipantRepository } from 'src/playlist/application/ports/participant.repository';
import { Participant } from 'src/playlist/domain/participant.entity';

// Test double for use-case specs: no database involved
export class InMemoryParticipantRepository implements ParticipantRepository {
  public readonly participants = new Map<string, Participant>();

  findById(id: string): Promise<Participant | null> {
    return Promise.resolve(this.participants.get(id) ?? null);
  }

  findByPlaylistAndAccount(infos: {
    playlistId: string;
    accountId: string;
  }): Promise<Participant | null> {
    for (const participant of this.participants.values()) {
      const isSamePlaylist = participant.playlistId === infos.playlistId;
      const isSameAccount = participant.accountId === infos.accountId;
      if (isSamePlaylist && isSameAccount) {
        return Promise.resolve(participant);
      }
    }
    return Promise.resolve(null);
  }

  findByPlaylist(playlistId: string): Promise<Participant[]> {
    const playlistParticipants: Participant[] = [];
    for (const participant of this.participants.values()) {
      if (participant.playlistId === playlistId) {
        playlistParticipants.push(participant);
      }
    }
    return Promise.resolve(playlistParticipants);
  }

  save(participant: Participant): Promise<void> {
    this.participants.set(participant.id, participant);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.participants.delete(id);
    return Promise.resolve();
  }
}
