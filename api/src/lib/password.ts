import bcrypt from 'bcryptjs';

const cost = () => (process.env.NODE_ENV === 'test' ? 4 : 10);

export const hashPassword = (plain: string) => bcrypt.hash(plain, cost());
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
