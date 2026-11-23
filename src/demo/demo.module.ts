import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ACCOUNT_REPOSITORY } from 'src/identity/application/ports/account.repository';
import { PASSWORD_HASHER } from 'src/identity/application/ports/password-hasher';
import { AccountOrmEntity } from 'src/identity/infrastructure/persistence/typeorm-account.entity';
import { TypeOrmAccountRepository } from 'src/identity/infrastructure/persistence/typeorm-account.repository';
import { BcryptPasswordService } from 'src/identity/infrastructure/crypto/bcrypt-password.service';
import { FRIENDSHIP_REPOSITORY } from 'src/social/application/ports/friendship.repository';
import { FRIENDSHIP_REQUEST_REPOSITORY } from 'src/social/application/ports/friendship-request.repository';
import { FriendshipOrmEntity } from 'src/social/infrastructure/persistence/friendship/typeorm-friendship.entity';
import { TypeOrmFriendshipRepository } from 'src/social/infrastructure/persistence/friendship/typeorm-friendship.repository';
import { FriendshipRequestOrmEntity } from 'src/social/infrastructure/persistence/friendship-request/typeorm-friendship-request.entity';
import { TypeOrmFriendshipRequestRepository } from 'src/social/infrastructure/persistence/friendship-request/typeorm-friendship-request.repository';
import { PLAYLIST_REPOSITORY } from 'src/playlist/application/ports/playlist.repository';
import { PARTICIPANT_REPOSITORY } from 'src/playlist/application/ports/participant.repository';
import { INVITATION_REPOSITORY } from 'src/playlist/application/ports/invitation.repository';
import { TRACK_REPOSITORY } from 'src/playlist/application/ports/track.repository';
import { VOTE_REPOSITORY } from 'src/playlist/application/ports/vote.repository';
import { PlaylistOrmEntity } from 'src/playlist/infrastructure/persistence/playlist/typeorm-playlist.entity';
import { TypeOrmPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/typeorm-playlist.repository';
import { ParticipantOrmEntity } from 'src/playlist/infrastructure/persistence/participant/typeorm-participant.entity';
import { TypeOrmParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/typeorm-participant.repository';
import { InvitationOrmEntity } from 'src/playlist/infrastructure/persistence/invitation/typeorm-invitation.entity';
import { TypeOrmInvitationRepository } from 'src/playlist/infrastructure/persistence/invitation/typeorm-invitation.repository';
import { TrackOrmEntity } from 'src/playlist/infrastructure/persistence/track/typeorm-track.entity';
import { TypeOrmTrackRepository } from 'src/playlist/infrastructure/persistence/track/typeorm-track.repository';
import { TrackVoteOrmEntity } from 'src/playlist/infrastructure/persistence/vote/typeorm-track-vote.entity';
import { TypeOrmVoteRepository } from 'src/playlist/infrastructure/persistence/vote/typeorm-vote.repository';
import { SeedDemoUseCase } from './application/use-cases/seed-demo/seed-demo.usecase';
import { RemoveDemoUseCase } from './application/use-cases/remove-demo/remove-demo.usecase';
import { DemoSeeder } from './infrastructure/demo-seeder';

// Fake users and playlists to show the app (see the README). The demo spans
// every module: it uses their repositories, never their HTTP routes.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountOrmEntity,
      FriendshipOrmEntity,
      FriendshipRequestOrmEntity,
      PlaylistOrmEntity,
      ParticipantOrmEntity,
      InvitationOrmEntity,
      TrackOrmEntity,
      TrackVoteOrmEntity,
    ]),
  ],
  providers: [
    { provide: ACCOUNT_REPOSITORY, useClass: TypeOrmAccountRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordService },
    { provide: FRIENDSHIP_REPOSITORY, useClass: TypeOrmFriendshipRepository },
    {
      provide: FRIENDSHIP_REQUEST_REPOSITORY,
      useClass: TypeOrmFriendshipRequestRepository,
    },
    { provide: PLAYLIST_REPOSITORY, useClass: TypeOrmPlaylistRepository },
    { provide: PARTICIPANT_REPOSITORY, useClass: TypeOrmParticipantRepository },
    { provide: INVITATION_REPOSITORY, useClass: TypeOrmInvitationRepository },
    { provide: TRACK_REPOSITORY, useClass: TypeOrmTrackRepository },
    { provide: VOTE_REPOSITORY, useClass: TypeOrmVoteRepository },
    SeedDemoUseCase,
    RemoveDemoUseCase,
    DemoSeeder,
  ],
  exports: [DemoSeeder],
})
export class DemoModule {}
