import { Inject, Injectable } from '@nestjs/common';
import {
  PLAYLIST_REPOSITORY,
  PlaylistRepository,
} from '../../ports/playlist.repository';
import {
  INVITATION_REPOSITORY,
  InvitationRepository,
} from '../../ports/invitation.repository';
import {
  ACCOUNT_DIRECTORY,
  AccountDirectory,
} from '../../ports/account-directory';
import {
  ListMyInvitationsInput,
  ListMyInvitationsOutput,
  ReceivedInvitation,
} from './list-my-invitations.contracts';

@Injectable()
export class ListMyInvitationsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: InvitationRepository,
    @Inject(ACCOUNT_DIRECTORY)
    private readonly accountDirectory: AccountDirectory,
  ) {}

  async execute(
    input: ListMyInvitationsInput,
  ): Promise<ListMyInvitationsOutput> {
    const invitations = await this.invitationRepository.findByInvitee(
      input.accountId,
    );

    const inviterIds = invitations.map((invitation) => invitation.inviterId);
    const inviters = await this.accountDirectory.findByIds(inviterIds);
    const usernameById = new Map<string, string>();
    for (const inviter of inviters) {
      usernameById.set(inviter.id, inviter.username);
    }

    const receivedInvitations: ReceivedInvitation[] = [];
    for (const invitation of invitations) {
      const playlist = await this.playlistRepository.findById(
        invitation.playlistId,
      );
      // Invitations are deleted with their playlist, this is only a safeguard
      if (!playlist) {
        continue;
      }
      receivedInvitations.push({
        id: invitation.id,
        playlistId: playlist.id,
        playlistName: playlist.name,
        playlistType: playlist.type,
        inviterId: invitation.inviterId,
        inviterUsername: usernameById.get(invitation.inviterId) ?? null,
      });
    }

    return {
      invitations: receivedInvitations,
    };
  }
}
