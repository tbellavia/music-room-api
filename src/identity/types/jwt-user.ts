export type JwtUser = {
  sub: string;
  username: string;
  // Long-lived token of a dev account: only accepted in dev mode
  dev?: boolean;
};
