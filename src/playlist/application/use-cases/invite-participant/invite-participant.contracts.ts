export type InviteParticipantInput = {
  playlistId: string;
  inviterId: string;
  inviteeId: string;
};

export type InviteParticipantOutput = {
  invitationId: string;
};
