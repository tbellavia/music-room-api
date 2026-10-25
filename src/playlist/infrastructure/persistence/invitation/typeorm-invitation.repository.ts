import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvitationRepository } from 'src/playlist/application/ports/invitation.repository';
import { Invitation } from 'src/playlist/domain/invitation.entity';
import { InvitationAlreadyExists } from 'src/playlist/domain/errors/invitation-already-exists.error';
import { isUniqueViolation } from 'src/infrastructure/database/error-utils';
import { InvitationOrmEntity } from './typeorm-invitation.entity';

@Injectable()
export class TypeOrmInvitationRepository implements InvitationRepository {
  constructor(
    @InjectRepository(InvitationOrmEntity)
    private readonly repository: Repository<InvitationOrmEntity>,
  ) {}

  async findById(id: string): Promise<Invitation | null> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      return null;
    }
    return this.toDomain(entity);
  }

  async findByPlaylistAndInvitee(infos: {
    playlistId: string;
    inviteeId: string;
  }): Promise<Invitation | null> {
    const entity = await this.repository.findOneBy({
      playlist_id: infos.playlistId,
      invitee_id: infos.inviteeId,
    });

    if (!entity) {
      return null;
    }
    return this.toDomain(entity);
  }

  async findByInvitee(inviteeId: string): Promise<Invitation[]> {
    const entities = await this.repository.findBy({ invitee_id: inviteeId });

    return entities.map((entity) => this.toDomain(entity));
  }

  async save(invitation: Invitation): Promise<void> {
    try {
      await this.repository.save(this.toOrm(invitation));
    } catch (error) {
      // Two concurrent invitations can both pass the use-case check
      if (isUniqueViolation(error)) {
        throw new InvitationAlreadyExists();
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  private toOrm(invitation: Invitation): InvitationOrmEntity {
    return {
      id: invitation.id,
      playlist_id: invitation.playlistId,
      inviter_id: invitation.inviterId,
      invitee_id: invitation.inviteeId,
    };
  }

  private toDomain(orm: InvitationOrmEntity): Invitation {
    return new Invitation(
      orm.id,
      orm.playlist_id,
      orm.inviter_id,
      orm.invitee_id,
    );
  }
}
