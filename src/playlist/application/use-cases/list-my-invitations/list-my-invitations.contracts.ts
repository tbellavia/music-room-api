import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';

export type ListMyInvitationsInput = {
  accountId: string;
};

export type ReceivedInvitation = {
  id: string;
  playlistId: string;
  playlistName: string;
  playlistType: PlaylistType;
  inviterId: string;
  inviterUsername: string | null;
};

export type ListMyInvitationsOutput = {
  invitations: ReceivedInvitation[];
};
