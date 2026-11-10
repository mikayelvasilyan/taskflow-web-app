import { describe, expect, it } from 'vitest';
import { INSECURE_DEV_SECRET, parseEnv } from '../../src/env.js';

describe('parseEnv', () => {
  it('applies defaults in development', () => {
    const env = parseEnv({});
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.JWT_SECRET).toBe(INSECURE_DEV_SECRET);
    expect(env.SEED_ON_START).toBe(true);
    expect(env.COOKIE_SECURE).toBe(false);
  });

  it('refuses to start in production without JWT_SECRET', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
  });

  it('accepts production with a secret', () => {
    const env = parseEnv({
      NODE_ENV: 'production',
      JWT_SECRET: 'x'.repeat(32),
      COOKIE_SECURE: 'true',
    });
    expect(env.COOKIE_SECURE).toBe(true);
  });
});
