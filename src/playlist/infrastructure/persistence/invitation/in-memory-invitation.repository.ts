import { InvitationRepository } from 'src/playlist/application/ports/invitation.repository';
import { Invitation } from 'src/playlist/domain/invitation.entity';

// Test double for use-case specs: no database involved
export class InMemoryInvitationRepository implements InvitationRepository {
  public readonly invitations = new Map<string, Invitation>();

  findById(id: string): Promise<Invitation | null> {
    return Promise.resolve(this.invitations.get(id) ?? null);
  }

  findByPlaylistAndInvitee(infos: {
    playlistId: string;
    inviteeId: string;
  }): Promise<Invitation | null> {
    for (const invitation of this.invitations.values()) {
      const isSamePlaylist = invitation.playlistId === infos.playlistId;
      const isSameInvitee = invitation.inviteeId === infos.inviteeId;
      if (isSamePlaylist && isSameInvitee) {
        return Promise.resolve(invitation);
      }
    }
    return Promise.resolve(null);
  }

  findByInvitee(inviteeId: string): Promise<Invitation[]> {
    const receivedInvitations: Invitation[] = [];
    for (const invitation of this.invitations.values()) {
      if (invitation.inviteeId === inviteeId) {
        receivedInvitations.push(invitation);
      }
    }
    return Promise.resolve(receivedInvitations);
  }

  save(invitation: Invitation): Promise<void> {
    this.invitations.set(invitation.id, invitation);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.invitations.delete(id);
    return Promise.resolve();
  }
}
