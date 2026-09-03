import { Inject, Injectable } from "@nestjs/common";
import { YOUTUBE_CLIENT_PORT, YoutubeClientPort } from "../../ports/youtube-client.port";
import { SearchMusicInput, SearchMusicOutput } from "./search-music.contracts";

@Injectable()
export class SearchMusicUseCase {
  constructor(
    @Inject(YOUTUBE_CLIENT_PORT)
    private readonly api: YoutubeClientPort,
  ) {}

  async execute(input: SearchMusicInput): Promise<SearchMusicOutput> {
    const musics = await this.api.search(input.name);

    return {
      musics: musics
    };
  }
}
