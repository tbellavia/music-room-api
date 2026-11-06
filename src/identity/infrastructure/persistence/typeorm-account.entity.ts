import { AuthMethod } from 'src/identity/domain/auth-method.enum';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('accounts')
export class AccountOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: AuthMethod })
  auth_method: AuthMethod;

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
