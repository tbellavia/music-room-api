import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { UserIdParam } from 'src/interface/http/decorators/user-param.decorator';
import { AddTrackUseCase } from 'src/playlist/application/use-cases/add-track/add-track.usecase';
import { ListTracksUseCase } from 'src/playlist/application/use-cases/list-tracks/list-tracks.usecase';
import { VoteForTrackUseCase } from 'src/playlist/application/use-cases/vote-for-track/vote-for-track.usecase';
import { WithdrawVoteUseCase } from 'src/playlist/application/use-cases/withdraw-vote/withdraw-vote.usecase';
import { MarkTrackPlayedUseCase } from 'src/playlist/application/use-cases/mark-track-played/mark-track-played.usecase';
import { DeleteTrackUseCase } from 'src/playlist/application/use-cases/delete-track/delete-track.usecase';
import { AddTrackDto } from './dto/add-track.dto';
import { PositionDto, toPosition } from './dto/position.dto';

@Controller('playlists')
export class TrackController {
  constructor(
    private readonly addTrack: AddTrackUseCase,
    private readonly listTracks: ListTracksUseCase,
    private readonly voteForTrack: VoteForTrackUseCase,
    private readonly withdrawVote: WithdrawVoteUseCase,
    private readonly markTrackPlayed: MarkTrackPlayedUseCase,
    private readonly deleteTrack: DeleteTrackUseCase,
  ) {}

  @Post(':playlistId/tracks')
  async add(
    @UserIdParam() accountId: string,
    @Param('playlistId') playlistId: string,
    @Body() addTrackDto: AddTrackDto,
  ) {
    return await this.addTrack.execute({
      playlistId,
      accountId,
      videoId: addTrackDto.videoId,
      position: toPosition(addTrackDto),
    });
  }

  @Get(':playlistId/tracks')
  async list(
    @UserIdParam() accountId: string,
    @Param('playlistId') playlistId: string,
  ) {
    return await this.listTracks.execute({
      playlistId,
      accountId,
    });
  }

  @Post(':playlistId/tracks/:trackId/vote')
  async vote(
    @UserIdParam() accountId: string,
    @Param('playlistId') playlistId: string,
    @Param('trackId') trackId: string,
    @Body() positionDto: PositionDto,
  ) {
    return await this.voteForTrack.execute({
      playlistId,
      trackId,
      accountId,
      position: toPosition(positionDto),
    });
  }

  // DELETE requests have no body: the position goes in the query string
  @Delete(':playlistId/tracks/:trackId/vote')
  async unvote(
    @UserIdParam() accountId: string,
    @Param('playlistId') playlistId: string,
    @Param('trackId') trackId: string,
    @Query() positionDto: PositionDto,
  ) {
    return await this.withdrawVote.execute({
      playlistId,
      trackId,
      accountId,
      position: toPosition(positionDto),
    });
  }

  @Post(':playlistId/tracks/:trackId/played')
  async played(
    @UserIdParam() accountId: string,
    @Param('playlistId') playlistId: string,
    @Param('trackId') trackId: string,
  ) {
    await this.markTrackPlayed.execute({
      playlistId,
      trackId,
      accountId,
    });
  }

  @Delete(':playlistId/tracks/:trackId')
  async delete(
    @UserIdParam() accountId: string,
    @Param('playlistId') playlistId: string,
    @Param('trackId') trackId: string,
    @Query() positionDto: PositionDto,
  ) {
    await this.deleteTrack.execute({
      playlistId,
      trackId,
      accountId,
      position: toPosition(positionDto),
    });
  }
}
