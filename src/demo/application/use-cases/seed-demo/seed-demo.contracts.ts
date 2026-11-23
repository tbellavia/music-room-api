import { Coordinates } from 'src/playlist/domain/geo';

export type SeedDemoInput = {
  // Password of every demo account
  password: string;
  origin: Coordinates;
  // Generated accounts on top of the scenario (SEED_COUNT), 0 for none
  crowdSize: number;
  // At startup: leave an existing demo untouched. Otherwise it is recreated,
  // which also brings its dates back to "now".
  onlyIfMissing: boolean;
  now?: Date;
};

export type SeedDemoOutput = {
  // false when the demo already existed and onlyIfMissing was set
  seeded: boolean;
  accounts: number;
  playlists: number;
  tracks: number;
  votes: number;
};
