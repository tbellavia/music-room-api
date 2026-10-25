import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountOrmEntity } from 'src/identity/infrastructure/persistence/typeorm-account.entity';
import { PlaylistController } from './interface/http/playlist.controller';
import { PlaylistOrmEntity } from './infrastructure/persistence/playlist/typeorm-playlist.entity';
import { ParticipantOrmEntity } from './infrastructure/persistence/participant/typeorm-participant.entity';
import { InvitationOrmEntity } from './infrastructure/persistence/invitation/typeorm-invitation.entity';
import { PLAYLIST_REPOSITORY } from './application/ports/playlist.repository';
import { TypeOrmPlaylistRepository } from './infrastructure/persistence/playlist/typeorm-playlist.repository';
import { PARTICIPANT_REPOSITORY } from './application/ports/participant.repository';
import { TypeOrmParticipantRepository } from './infrastructure/persistence/participant/typeorm-participant.repository';
import { INVITATION_REPOSITORY } from './application/ports/invitation.repository';
import { TypeOrmInvitationRepository } from './infrastructure/persistence/invitation/typeorm-invitation.repository';
import { ACCOUNT_DIRECTORY } from './application/ports/account-directory';
import { TypeOrmAccountDirectory } from './infrastructure/persistence/account/typeorm-account-directory';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlaylistOrmEntity,
      ParticipantOrmEntity,
      InvitationOrmEntity,
      AccountOrmEntity,
    ]),
  ],
  controllers: [PlaylistController],
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
  ],
})
export class PlaylistModule {}
