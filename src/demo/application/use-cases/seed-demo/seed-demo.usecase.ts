import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from 'src/identity/application/ports/account.repository';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from 'src/identity/application/ports/password-hasher';
import {
  FRIENDSHIP_REPOSITORY,
  FriendshipRepository,
} from 'src/social/application/ports/friendship.repository';
import {
  FRIENDSHIP_REQUEST_REPOSITORY,
  FriendshipRequestRepository,
} from 'src/social/application/ports/friendship-request.repository';
import {
  PLAYLIST_REPOSITORY,
  PlaylistRepository,
} from 'src/playlist/application/ports/playlist.repository';
import {
  PARTICIPANT_REPOSITORY,
  ParticipantRepository,
} from 'src/playlist/application/ports/participant.repository';
import {
  INVITATION_REPOSITORY,
  InvitationRepository,
} from 'src/playlist/application/ports/invitation.repository';
import {
  TRACK_REPOSITORY,
  TrackRepository,
} from 'src/playlist/application/ports/track.repository';
import {
  VOTE_REPOSITORY,
  VoteRepository,
} from 'src/playlist/application/ports/vote.repository';
import { Account } from 'src/identity/domain/account.entity';
import { DEV1_ACCOUNT, DEV2_ACCOUNT } from 'src/identity/domain/dev-accounts';
import { Friendship } from 'src/social/domain/friendship.entity';
import { FriendshipRequest } from 'src/social/domain/friendship-request.entity';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { Participant } from 'src/playlist/domain/participant.entity';
import { Invitation } from 'src/playlist/domain/invitation.entity';
import { Track } from 'src/playlist/domain/track.entity';
import { TrackVote } from 'src/playlist/domain/track-vote.entity';
import { positionBetween } from 'src/playlist/domain/track-ordering';
import { DEMO_ACCOUNTS, DemoAccountInfos } from 'src/demo/domain/demo-accounts';
import { buildDemoScenario } from 'src/demo/domain/demo-scenario';
import { buildDemoCrowd } from 'src/demo/domain/demo-crowd';
import {
  DemoFriendship,
  DemoFriendshipRequest,
  DemoPlaylist,
} from 'src/demo/domain/demo-data';
import { RemoveDemoUseCase } from '../remove-demo/remove-demo.usecase';
import { SeedDemoInput, SeedDemoOutput } from './seed-demo.contracts';

type PlaylistCounts = {
  tracks: number;
  votes: number;
};

// The scenario and the generated crowd, created the same way
type DemoContent = {
  accounts: DemoAccountInfos[];
  friendships: DemoFriendship[];
  friendshipRequests: DemoFriendshipRequest[];
  playlists: DemoPlaylist[];
};

// Every object is built with the domain factories: a demo that breaks a rule of
// the domain fails here instead of ending up in the database
@Injectable()
export class SeedDemoUseCase {
  private readonly logger = new Logger(SeedDemoUseCase.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(FRIENDSHIP_REPOSITORY)
    private readonly friendshipRepository: FriendshipRepository,
    @Inject(FRIENDSHIP_REQUEST_REPOSITORY)
    private readonly friendshipRequestRepository: FriendshipRequestRepository,
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: InvitationRepository,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: TrackRepository,
    @Inject(VOTE_REPOSITORY)
    private readonly voteRepository: VoteRepository,
    private readonly removeDemo: RemoveDemoUseCase,
  ) {}

  async execute(input: SeedDemoInput): Promise<SeedDemoOutput> {
    if (input.onlyIfMissing) {
      const isSeeded = await this.isSeeded();
      if (isSeeded) {
        return {
          seeded: false,
          accounts: 0,
          playlists: 0,
          tracks: 0,
          votes: 0,
        };
      }
    }

    await this.removeDemo.execute();

    const withDevAccounts = await this.devAccountsExist();
    const content = this.buildContent(input, withDevAccounts);
    await this.throwIfNameTaken(content.accounts);

    await this.createAccounts(input.password, content.accounts);
    await this.createSocialGraph(content);
    const counts = await this.createPlaylists(content.playlists);

    this.logger.log(
      `Demo seeded: ${content.accounts.length} accounts (crowd: ${input.crowdSize}), ${content.playlists.length} playlists, ${counts.tracks} tracks, ${counts.votes} votes (dev accounts: ${withDevAccounts})`,
    );
    return {
      seeded: true,
      accounts: content.accounts.length,
      playlists: content.playlists.length,
      tracks: counts.tracks,
      votes: counts.votes,
    };
  }

  private buildContent(
    input: SeedDemoInput,
    withDevAccounts: boolean,
  ): DemoContent {
    const now = input.now ?? new Date();
    const scenario = buildDemoScenario({
      now,
      origin: input.origin,
      withDevAccounts,
    });
    const crowd = buildDemoCrowd({
      size: input.crowdSize,
      now,
      origin: input.origin,
    });

    return {
      accounts: [...DEMO_ACCOUNTS, ...crowd.accounts],
      friendships: [...scenario.friendships, ...crowd.friendships],
      friendshipRequests: [
        ...scenario.friendshipRequests,
        ...crowd.friendshipRequests,
      ],
      playlists: [...scenario.playlists, ...crowd.playlists],
    };
  }

  // A partial demo (seed interrupted) also counts: `make seed` recreates it
  private async isSeeded(): Promise<boolean> {
    for (const demoAccount of DEMO_ACCOUNTS) {
      const existing = await this.accountRepository.findById(demoAccount.id);
      if (existing) {
        return true;
      }
    }
    return false;
  }

  // The demo accounts were just removed: an account found here is a real one,
  // which must stay untouched
  private async throwIfNameTaken(accounts: DemoAccountInfos[]): Promise<void> {
    for (const demoAccount of accounts) {
      const isTaken = await this.isUsernameOrEmailTaken(demoAccount);
      if (isTaken) {
        throw new Error(
          `Demo not seeded: the username ${demoAccount.username} or its email is taken by a real account`,
        );
      }
    }
  }

  private async isUsernameOrEmailTaken(
    infos: DemoAccountInfos,
  ): Promise<boolean> {
    const byUsername = await this.accountRepository.findByUsername(
      infos.username,
    );
    if (byUsername) {
      return true;
    }
    const byEmail = await this.accountRepository.findByEmail(infos.email);
    return byEmail !== null;
  }

  private async devAccountsExist(): Promise<boolean> {
    const dev1 = await this.accountRepository.findById(DEV1_ACCOUNT.id);
    const dev2 = await this.accountRepository.findById(DEV2_ACCOUNT.id);
    return dev1 !== null && dev2 !== null;
  }

  // Hashed once: bcrypt is slow on purpose, and every account shares it
  private async createAccounts(
    password: string,
    accounts: DemoAccountInfos[],
  ): Promise<void> {
    const hashedPassword = await this.passwordHasher.hash(password);
    for (const demoAccount of accounts) {
      const account = Account.preVerified({
        ...demoAccount,
        password: hashedPassword,
      });
      await this.accountRepository.save(account);
    }
  }

  private async createSocialGraph(content: DemoContent): Promise<void> {
    for (const demoFriendship of content.friendships) {
      const friendship = Friendship.create({
        id: randomUUID(),
        ...demoFriendship,
      });
      await this.friendshipRepository.save(friendship);
    }
    for (const demoRequest of content.friendshipRequests) {
      const request = FriendshipRequest.create({
        id: randomUUID(),
        ...demoRequest,
      });
      await this.friendshipRequestRepository.save(request);
    }
  }

  private async createPlaylists(
    demoPlaylists: DemoPlaylist[],
  ): Promise<PlaylistCounts> {
    const counts: PlaylistCounts = { tracks: 0, votes: 0 };
    for (const demoPlaylist of demoPlaylists) {
      const playlistCounts = await this.createPlaylist(demoPlaylist);
      counts.tracks = counts.tracks + playlistCounts.tracks;
      counts.votes = counts.votes + playlistCounts.votes;
    }
    return counts;
  }

  private async createPlaylist(
    demoPlaylist: DemoPlaylist,
  ): Promise<PlaylistCounts> {
    const playlist = Playlist.create(demoPlaylist.infos);
    await this.playlistRepository.save(playlist);

    for (const demoParticipant of demoPlaylist.participants) {
      const participant = Participant.create({
        id: randomUUID(),
        playlistId: playlist.id,
        accountId: demoParticipant.accountId,
        joinedVia: demoParticipant.joinedVia,
      });
      participant.hasPrivilege = demoParticipant.hasPrivilege;
      await this.participantRepository.save(participant);
    }

    for (const demoInvitation of demoPlaylist.invitations) {
      const invitation = Invitation.create({
        id: randomUUID(),
        playlistId: playlist.id,
        ...demoInvitation,
      });
      await this.invitationRepository.save(invitation);
    }

    return await this.createTracks(playlist, demoPlaylist);
  }

  private async createTracks(
    playlist: Playlist,
    demoPlaylist: DemoPlaylist,
  ): Promise<PlaylistCounts> {
    const counts: PlaylistCounts = { tracks: 0, votes: 0 };
    let lastPosition: number | null = null;

    for (const demoTrack of demoPlaylist.tracks) {
      // EDITOR tracks keep the order of the scenario, VOTE tracks are ranked
      let position: number | null = null;
      if (playlist.isEditorPlaylist()) {
        position = positionBetween(lastPosition, null);
        lastPosition = position;
      }
      const track = Track.create({
        id: randomUUID(),
        playlistId: playlist.id,
        music: demoTrack.music,
        addedBy: demoTrack.addedBy,
        addedAt: demoTrack.addedAt,
        position,
      });
      if (demoTrack.playedAt !== null) {
        track.markAsPlayed(demoTrack.playedAt);
      }
      await this.trackRepository.save(track);
      counts.tracks = counts.tracks + 1;

      for (const voterId of demoTrack.voterIds) {
        await this.voteRepository.add(
          TrackVote.create({ trackId: track.id, accountId: voterId }),
        );
        counts.votes = counts.votes + 1;
      }
    }
    return counts;
  }
}
