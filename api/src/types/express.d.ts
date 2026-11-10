import type { Role } from '../db/schema.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarColor: string;
  isProtected: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
