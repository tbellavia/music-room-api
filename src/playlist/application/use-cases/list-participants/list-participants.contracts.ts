export type ListParticipantsInput = {
  playlistId: string;
  accountId: string;
};

export type PlaylistOwner = {
  id: string;
  username: string | null;
};

export type PlaylistParticipant = {
  participantId: string;
  id: string;
  username: string | null;
  hasPrivilege: boolean;
};

export type ListParticipantsOutput = {
  owner: PlaylistOwner;
  participants: PlaylistParticipant[];
};
