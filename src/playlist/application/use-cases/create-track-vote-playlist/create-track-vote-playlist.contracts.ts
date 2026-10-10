export type CreateTrackVotePlaylistInput = {
  creatorId: string;
  name: string;
  description: string;
  visibility: boolean;
  begin: Date;
  end: Date;
  latitude: number;
  longitude: number;
};

export type CreateTrackVotePlaylistOutput = {
  id: string;
};
