import { z } from 'zod';

/** String that reports "Required" when missing instead of zod's default wording. */
export const reqString = (label = 'This field') =>
  z.string({
    error: (iss) => (iss.input === undefined ? `${label} is required` : `${label} must be text`),
  });

export const email = z
  .string({
    error: (iss) => (iss.input === undefined ? 'Email is required' : 'Enter a valid email'),
  })
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email'));

export const password = reqString('Password')
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a digit');

export const name = reqString('Name')
  .trim()
  .min(1, 'Name is required')
  .max(80, 'Name must be at most 80 characters');

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #2F5BEA');

export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Enter a valid date');
