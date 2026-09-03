import { Music } from "src/music/domain/music.entity";

export type SearchMusicInput = {
  name: string;
};

export type SearchMusicOutput = {
  musics: Music[];
};
