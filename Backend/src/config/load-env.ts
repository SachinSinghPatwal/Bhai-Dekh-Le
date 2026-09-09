import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

/**
 * Loads the Backend environment file independently of the process working
 * directory, so both the server and standalone CLI scripts use the same
 * configuration.
 */
dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
});
