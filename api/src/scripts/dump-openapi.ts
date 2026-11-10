import { writeFileSync } from 'node:fs';
import { buildOpenApiDocument } from '../openapi.js';

/** Writes the spec to a file (default: stdout). Used to generate web/src/api/schema.d.ts. */
const out = process.argv[2];
const json = JSON.stringify(buildOpenApiDocument(), null, 2);
if (out) writeFileSync(out, json);
else process.stdout.write(json);
