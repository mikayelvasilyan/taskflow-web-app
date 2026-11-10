import jwt from 'jsonwebtoken';
import type { Env } from '../env.js';

export interface TokenPayload {
  sub: string;
}

export const signToken = (userId: string, env: Pick<Env, 'JWT_SECRET' | 'JWT_EXPIRES_IN'>) =>
  jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

export function verifyToken(token: string, env: Pick<Env, 'JWT_SECRET'>): TokenPayload | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'object' && typeof payload.sub === 'string') return { sub: payload.sub };
    return null;
  } catch {
    return null;
  }
}
