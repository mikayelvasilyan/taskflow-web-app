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
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
