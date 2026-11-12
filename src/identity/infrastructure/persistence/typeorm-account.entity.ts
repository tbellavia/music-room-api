import { AuthMethod } from 'src/identity/domain/auth-method.enum';
import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

// Named so that a violation tells which field is already used
export const ACCOUNT_EMAIL_UNIQUE_CONSTRAINT = 'UQ_accounts_email';
export const ACCOUNT_USERNAME_UNIQUE_CONSTRAINT = 'UQ_accounts_username';
export const ACCOUNT_GOOGLE_ID_UNIQUE_CONSTRAINT = 'UQ_accounts_google_id';

@Entity('accounts')
@Unique(ACCOUNT_EMAIL_UNIQUE_CONSTRAINT, ['email'])
@Unique(ACCOUNT_USERNAME_UNIQUE_CONSTRAINT, ['username'])
// Several NULL values do not violate it: only Google accounts have one
@Unique(ACCOUNT_GOOGLE_ID_UNIQUE_CONSTRAINT, ['google_id'])
export class AccountOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  email: string;

  @Column()
  username: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  password: string | null;

  @Column({ type: 'enum', enum: AuthMethod })
  auth_method: AuthMethod;

  @Column({ type: 'varchar', nullable: true, default: null })
  google_id: string | null;

  @Column({ type: 'varchar', length: 6, nullable: true, default: null })
  otp_code: string | null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  otp_expiry: Date | null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  otp_sent_at: Date | null;

  @Column({ type: 'int', default: 0 })
  otp_attempts: number;

  @Column({ type: 'boolean', default: false })
  is_active: boolean;
}
