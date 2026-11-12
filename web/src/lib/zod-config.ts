import { z } from 'zod';

/**
 * Zod 4 probes `new Function()` to compile faster object validators. Our Content-Security-Policy
 * forbids eval, so the probe would be reported as a policy violation on every page. Jitless mode
 * skips the probe. Zod reads this when a schema is created, so this module must be imported
 * before any module that defines a schema (it is the first import in main.tsx).
 */
z.config({ jitless: true });
