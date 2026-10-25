import { Invitation } from 'src/playlist/domain/invitation.entity';

export interface InvitationRepository {
  findById(id: string): Promise<Invitation | null>;
  findByPlaylistAndInvitee(infos: {
    playlistId: string;
    inviteeId: string;
  }): Promise<Invitation | null>;
  findByInvitee(inviteeId: string): Promise<Invitation[]>;
  save(invitation: Invitation): Promise<void>;
  delete(id: string): Promise<void>;
}

export const INVITATION_REPOSITORY = Symbol('InvitationRepository');
