import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserIdParam } from 'src/interface/http/decorators/user-param.decorator';
import { CreatePlaylistUseCase } from 'src/playlist/application/use-cases/create-playlist/create-playlist.usecase';
import { ListPublicPlaylistsUseCase } from 'src/playlist/application/use-cases/list-public-playlists/list-public-playlists.usecase';
import { ListMyPlaylistsUseCase } from 'src/playlist/application/use-cases/list-my-playlists/list-my-playlists.usecase';
import { ListMyRecentPlaylistsUseCase } from 'src/playlist/application/use-cases/list-my-recent-playlists/list-my-recent-playlists.usecase';
import { ListPublicEventsUseCase } from 'src/playlist/application/use-cases/list-public-events/list-public-events.usecase';
import { JoinPlaylistUseCase } from 'src/playlist/application/use-cases/join-playlist/join-playlist.usecase';
import { InviteParticipantUseCase } from 'src/playlist/application/use-cases/invite-participant/invite-participant.usecase';
import { ListMyInvitationsUseCase } from 'src/playlist/application/use-cases/list-my-invitations/list-my-invitations.usecase';
import { AcceptInvitationUseCase } from 'src/playlist/application/use-cases/accept-invitation/accept-invitation.usecase';
import { DeclineInvitationUseCase } from 'src/playlist/application/use-cases/decline-invitation/decline-invitation.usecase';
import { CancelInvitationUseCase } from 'src/playlist/application/use-cases/cancel-invitation/cancel-invitation.usecase';
import { ListParticipantsUseCase } from 'src/playlist/application/use-cases/list-participants/list-participants.usecase';
import { UpdateParticipantPrivilegeUseCase } from 'src/playlist/application/use-cases/update-participant-privilege/update-participant-privilege.usecase';
import { RemoveParticipantUseCase } from 'src/playlist/application/use-cases/remove-participant/remove-participant.usecase';
import { LeavePlaylistUseCase } from 'src/playlist/application/use-cases/leave-playlist/leave-playlist.usecase';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { JoinPlaylistDto } from './dto/join-playlist.dto';
import { toPosition } from './dto/position.dto';
import { ListMyPlaylistsDto } from './dto/list-my-playlists.dto';
import { ListPublicEventsDto } from './dto/list-public-events.dto';
import { InviteParticipantDto } from './dto/invite-participant.dto';
import { UpdateParticipantPrivilegeDto } from './dto/update-participant-privilege.dto';

@Controller('playlists')
export class PlaylistController {
  constructor(
    private readonly createPlaylist: CreatePlaylistUseCase,
    private readonly listPublicPlaylists: ListPublicPlaylistsUseCase,
    private readonly listMyPlaylists: ListMyPlaylistsUseCase,
    private readonly listMyRecentPlaylists: ListMyRecentPlaylistsUseCase,
    private readonly listPublicEvents: ListPublicEventsUseCase,
    private readonly joinPlaylist: JoinPlaylistUseCase,
    private readonly inviteParticipant: InviteParticipantUseCase,
    private readonly listMyInvitations: ListMyInvitationsUseCase,
    private readonly acceptInvitation: AcceptInvitationUseCase,
    private readonly declineInvitation: DeclineInvitationUseCase,
    private readonly cancelInvitation: CancelInvitationUseCase,
    private readonly listParticipants: ListParticipantsUseCase,
    private readonly updateParticipantPrivilege: UpdateParticipantPrivilegeUseCase,
    private readonly removeParticipant: RemoveParticipantUseCase,
    private readonly leavePlaylist: LeavePlaylistUseCase,
  ) {}

  @Post()
  async create(
    @UserIdParam() ownerId: string,
    @Body() createPlaylistDto: CreatePlaylistDto,
  ) {
    return await this.createPlaylist.execute({
      ownerId,
      type: createPlaylistDto.type,
      name: createPlaylistDto.name,
      description: createPlaylistDto.description,
      isPrivate: createPlaylistDto.isPrivate,
      license: createPlaylistDto.license,
      beginAt: createPlaylistDto.beginAt,
      endAt: createPlaylistDto.endAt,
      latitude: createPlaylistDto.latitude,
      longitude: createPlaylistDto.longitude,
    });
  }

  @Get('public')
  async listPublic() {
    return await this.listPublicPlaylists.execute();
  }

  @Get('me')
  async listMine(
    @UserIdParam() accountId: string,
    @Query() listMyPlaylistsDto: ListMyPlaylistsDto,
  ) {
    return await this.listMyPlaylists.execute({
      accountId,
      role: listMyPlaylistsDto.role,
      status: listMyPlaylistsDto.status,
      order: listMyPlaylistsDto.order,
    });
  }

  @Get('me/recent')
  async listMyRecent(@UserIdParam() accountId: string) {
    return await this.listMyRecentPlaylists.execute({ accountId });
  }

  @Get('events')
  async listEvents(
    @UserIdParam() accountId: string,
    @Query() listPublicEventsDto: ListPublicEventsDto,
  ) {
    return await this.listPublicEvents.execute({
      accountId,
      position: toPosition(listPublicEventsDto),
    });
  }

  @Post(':playlistId/join')
  async join(
    @UserIdParam() accountId: string,
    @Param('playlistId') playlistId: string,
    @Body() joinPlaylistDto: JoinPlaylistDto,
  ) {
    return await this.joinPlaylist.execute({
      playlistId,
      accountId,
      position: toPosition(joinPlaylistDto),
    });
  }

  @Post(':playlistId/leave')
  async leave(
    @UserIdParam() accountId: string,
    @Param('playlistId') playlistId: string,
  ) {
    await this.leavePlaylist.execute({
      playlistId,
      accountId,
    });
  }

  @Post(':playlistId/invitations')
  async invite(
    @UserIdParam() inviterId: string,
    @Param('playlistId') playlistId: string,
    @Body() inviteParticipantDto: InviteParticipantDto,
  ) {
    return await this.inviteParticipant.execute({
      playlistId,
      inviterId,
      inviteeId: inviteParticipantDto.accountId,
    });
  }

  @Get('invitations')
  async myInvitations(@UserIdParam() accountId: string) {
    return await this.listMyInvitations.execute({
      accountId,
    });
  }

  @Post('invitations/:invitationId/accept')
  async accept(
    @UserIdParam() accountId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return await this.acceptInvitation.execute({
      invitationId,
      accountId,
    });
  }

  @Delete('invitations/:invitationId/decline')
  async decline(
    @UserIdParam() accountId: string,
    @Param('invitationId') invitationId: string,
  ) {
    await this.declineInvitation.execute({
      invitationId,
      accountId,
    });
  }

  @Delete('invitations/:invitationId/cancel')
  async cancel(
    @UserIdParam() accountId: string,
    @Param('invitationId') invitationId: string,
  ) {
    await this.cancelInvitation.execute({
      invitationId,
      accountId,
    });
  }

  @Get(':playlistId/participants')
  async participants(
    @UserIdParam() accountId: string,
    @Param('playlistId') playlistId: string,
  ) {
    return await this.listParticipants.execute({
      playlistId,
      accountId,
    });
  }

  @Patch(':playlistId/participants/:participantId')
  async updatePrivilege(
    @UserIdParam() accountId: string,
    @Param('playlistId') playlistId: string,
    @Param('participantId') participantId: string,
    @Body() updateParticipantPrivilegeDto: UpdateParticipantPrivilegeDto,
  ) {
    await this.updateParticipantPrivilege.execute({
      playlistId,
      participantId,
      accountId,
      hasPrivilege: updateParticipantPrivilegeDto.hasPrivilege,
    });
  }

  @Delete(':playlistId/participants/:participantId')
  async remove(
    @UserIdParam() accountId: string,
    @Param('playlistId') playlistId: string,
    @Param('participantId') participantId: string,
  ) {
    await this.removeParticipant.execute({
      playlistId,
      participantId,
      accountId,
    });
  }
}
