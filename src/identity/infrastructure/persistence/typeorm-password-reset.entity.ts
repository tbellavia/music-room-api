import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { AccountOrmEntity } from './typeorm-account.entity';

// The account id is the primary key: at most one pending reset per account
@Entity('password_resets')
export class PasswordResetOrmEntity {
  @PrimaryColumn()
  account_id: string;

  @OneToOne(() => AccountOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account?: Relation<AccountOrmEntity>;

  // SHA-256 of the code, in hexadecimal
  @Column({ type: 'varchar', length: 64 })
  code_hash: string;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ type: 'timestamp' })
  sent_at: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;
}
