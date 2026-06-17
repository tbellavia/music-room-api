import { JwtUser } from 'src/identity/types/jwt-user';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}
