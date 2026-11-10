import { z } from 'zod';
import { email, name, password, reqString } from './common.js';

export const signupBody = z.object({ name, email, password });

export const loginBody = z.object({
  email,
  password: reqString('Password').min(1, 'Password is required'),
});

export const updateMeBody = z
  .object({
    name: name.optional(),
    currentPassword: z.string().optional(),
    newPassword: password.optional(),
  })
  .refine((v) => !v.newPassword || !!v.currentPassword, {
    path: ['currentPassword'],
    message: 'Current password is required to set a new one',
  });

export type SignupBody = z.infer<typeof signupBody>;
