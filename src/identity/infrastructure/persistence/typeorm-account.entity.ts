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
}
