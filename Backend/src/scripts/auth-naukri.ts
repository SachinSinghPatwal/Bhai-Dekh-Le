import '../config/load-env.js';
import { NaukriAuthService } from '../services/playwright/naukri/NaukriAuthService.js';
import connectToMongoDb, { disconnectFromMongoDb } from '../db/MongoDb.js';
import { isMongoObjectId } from '../utility/user-id.js';
import logger from '../utility/logger.js';

/**
 * CLI script to authenticate with Naukri
 * Run: npm run automation:auth -- <24-character-mongodb-user-id>
 */
async function main() {
  try {
    const userId = process.argv[2];
    if (!userId) {
      console.error('Usage: npm run automation:auth -- <24-character-mongodb-user-id>');
      process.exit(1);
    }

    if (!isMongoObjectId(userId)) {
      console.error('Invalid user ID. Pass the user\'s MongoDB _id (a 24-character hexadecimal value).');
      process.exit(1);
    }

    logger.info('Starting Naukri authentication CLI', { userId });

    // Services read/write the user document directly, so the connection has to
    // be open before any of them run.
    await connectToMongoDb();

    const authService = new NaukriAuthService();
    const result = await authService.authenticate(userId);

    await disconnectFromMongoDb();

    if (result.success) {
      console.log('✓ Authentication successful!');
      console.log('✓ Storage state saved to database');
      process.exit(0);
    } else {
      console.error('✗ Authentication failed:', result.message);
      process.exit(1);
    }
  } catch (error) {
    logger.error('CLI error', { error });
    console.error('Error:', error);
    await disconnectFromMongoDb().catch(() => undefined);
    process.exit(1);
  }
}

main();
