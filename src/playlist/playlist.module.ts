import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountOrmEntity } from 'src/identity/infrastructure/persistence/typeorm-account.entity';
import { PlaylistController } from './interface/http/playlist.controller';
import { TrackController } from './interface/http/track.controller';
import { PlaylistEventsController } from './interface/http/playlist-events.controller';
import { PlaylistOrmEntity } from './infrastructure/persistence/playlist/typeorm-playlist.entity';
import { ParticipantOrmEntity } from './infrastructure/persistence/participant/typeorm-participant.entity';
import { InvitationOrmEntity } from './infrastructure/persistence/invitation/typeorm-invitation.entity';
import { TrackOrmEntity } from './infrastructure/persistence/track/typeorm-track.entity';
import { TrackVoteOrmEntity } from './infrastructure/persistence/vote/typeorm-track-vote.entity';
import { PLAYLIST_REPOSITORY } from './application/ports/playlist.repository';
import { TypeOrmPlaylistRepository } from './infrastructure/persistence/playlist/typeorm-playlist.repository';
import { PARTICIPANT_REPOSITORY } from './application/ports/participant.repository';
import { TypeOrmParticipantRepository } from './infrastructure/persistence/participant/typeorm-participant.repository';
import { INVITATION_REPOSITORY } from './application/ports/invitation.repository';
import { TypeOrmInvitationRepository } from './infrastructure/persistence/invitation/typeorm-invitation.repository';
import { ACCOUNT_DIRECTORY } from './application/ports/account-directory';
import { TypeOrmAccountDirectory } from './infrastructure/persistence/account/typeorm-account-directory';
import { TRACK_REPOSITORY } from './application/ports/track.repository';
import { TypeOrmTrackRepository } from './infrastructure/persistence/track/typeorm-track.repository';
import { VOTE_REPOSITORY } from './application/ports/vote.repository';
import { TypeOrmVoteRepository } from './infrastructure/persistence/vote/typeorm-vote.repository';
import { MUSIC_CATALOG } from './application/ports/music-catalog';
import { YtMusicCatalog } from './infrastructure/music/ytmusic-catalog';
import { PLAYLIST_EVENT_BUS } from './application/ports/playlist-event-bus';
import { RxjsPlaylistEventBus } from './infrastructure/events/rxjs-playlist-event-bus';
import { CreatePlaylistUseCase } from './application/use-cases/create-playlist/create-playlist.usecase';
import { ListPublicPlaylistsUseCase } from './application/use-cases/list-public-playlists/list-public-playlists.usecase';
import { JoinPlaylistUseCase } from './application/use-cases/join-playlist/join-playlist.usecase';
import { InviteParticipantUseCase } from './application/use-cases/invite-participant/invite-participant.usecase';
import { ListMyInvitationsUseCase } from './application/use-cases/list-my-invitations/list-my-invitations.usecase';
import { AcceptInvitationUseCase } from './application/use-cases/accept-invitation/accept-invitation.usecase';
import { DeclineInvitationUseCase } from './application/use-cases/decline-invitation/decline-invitation.usecase';
import { CancelInvitationUseCase } from './application/use-cases/cancel-invitation/cancel-invitation.usecase';
import { ListParticipantsUseCase } from './application/use-cases/list-participants/list-participants.usecase';
import { UpdateParticipantPrivilegeUseCase } from './application/use-cases/update-participant-privilege/update-participant-privilege.usecase';
import { RemoveParticipantUseCase } from './application/use-cases/remove-participant/remove-participant.usecase';
import { LeavePlaylistUseCase } from './application/use-cases/leave-playlist/leave-playlist.usecase';
import { AddTrackUseCase } from './application/use-cases/add-track/add-track.usecase';
import { ListTracksUseCase } from './application/use-cases/list-tracks/list-tracks.usecase';
import { VoteForTrackUseCase } from './application/use-cases/vote-for-track/vote-for-track.usecase';
import { WithdrawVoteUseCase } from './application/use-cases/withdraw-vote/withdraw-vote.usecase';
import { MarkTrackPlayedUseCase } from './application/use-cases/mark-track-played/mark-track-played.usecase';
import { DeleteTrackUseCase } from './application/use-cases/delete-track/delete-track.usecase';
import { WatchPlaylistEventsUseCase } from './application/use-cases/watch-playlist-events/watch-playlist-events.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlaylistOrmEntity,
      ParticipantOrmEntity,
      InvitationOrmEntity,
      TrackOrmEntity,
      TrackVoteOrmEntity,
      AccountOrmEntity,
    ]),
  ],
  controllers: [PlaylistController, TrackController, PlaylistEventsController],
  providers: [
    {
      provide: PLAYLIST_REPOSITORY,
      useClass: TypeOrmPlaylistRepository,
    },
    {
      provide: PARTICIPANT_REPOSITORY,
      useClass: TypeOrmParticipantRepository,
    },
    {
      provide: INVITATION_REPOSITORY,
      useClass: TypeOrmInvitationRepository,
    },
    {
      provide: ACCOUNT_DIRECTORY,
      useClass: TypeOrmAccountDirectory,
    },
    {
      provide: TRACK_REPOSITORY,
      useClass: TypeOrmTrackRepository,
    },
    {
      provide: VOTE_REPOSITORY,
      useClass: TypeOrmVoteRepository,
    },
    {
      provide: MUSIC_CATALOG,
      useClass: YtMusicCatalog,
    },
    // A single bus instance shared by the publishers and the SSE stream
    {
      provide: PLAYLIST_EVENT_BUS,
      useClass: RxjsPlaylistEventBus,
    },
    CreatePlaylistUseCase,
    ListPublicPlaylistsUseCase,
    JoinPlaylistUseCase,
    InviteParticipantUseCase,
    ListMyInvitationsUseCase,
    AcceptInvitationUseCase,
    DeclineInvitationUseCase,
    CancelInvitationUseCase,
    ListParticipantsUseCase,
    UpdateParticipantPrivilegeUseCase,
    RemoveParticipantUseCase,
    LeavePlaylistUseCase,
    AddTrackUseCase,
    ListTracksUseCase,
    VoteForTrackUseCase,
    WithdrawVoteUseCase,
    MarkTrackPlayedUseCase,
    DeleteTrackUseCase,
    WatchPlaylistEventsUseCase,
  ],
})
export class PlaylistModule {}
