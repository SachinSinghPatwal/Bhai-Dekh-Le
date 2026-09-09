import { FullAutomationPipeline } from '../services/FullAutomationPipeline.js';
import logger from '../utility/logger.js';

/**
 * CLI script to run the complete automation pipeline
 *
 * Usage:
 *   npm run automation:full <userId> [options]
 *
 * Options (via command line):
 *   --skip-auth          Skip authentication (use existing session)
 *   --max-jobs=50        Maximum jobs to scrape (default: 50)
 *   --threshold=70       Match threshold (default: 70)
 *   --no-tailor          Skip resume tailoring
 *   --no-upload          Skip profile upload
 *
 * Example:
 *   npm run automation:full 66e4f1234567890abcdef123 --max-jobs=30 --threshold=80
 */

async function main() {
  try {
    const args = process.argv.slice(2);
    const userId = args[0];

    if (!userId) {
      console.error('❌ Usage: npm run automation:full <userId> [options]');
      console.error('');
      console.error('Options:');
      console.error('  --skip-auth          Skip authentication');
      console.error('  --max-jobs=N         Max jobs to scrape (default: 50)');
      console.error('  --threshold=N        Match threshold (default: 70)');
      console.error('  --no-tailor          Skip resume tailoring');
      console.error('  --no-upload          Skip profile upload');
      console.error('');
      console.error('Example:');
      console.error('  npm run automation:full 66e4f12345 --max-jobs=30 --threshold=80');
      process.exit(1);
    }

    // Parse options
    const options = {
      skipAuth: args.includes('--skip-auth'),
      maxJobs: parseInt(args.find(a => a.startsWith('--max-jobs='))?.split('=')[1] || '50'),
      matchThreshold: parseInt(args.find(a => a.startsWith('--threshold='))?.split('=')[1] || '70'),
      tailorResume: !args.includes('--no-tailor'),
      uploadToProfile: !args.includes('--no-upload'),
    };

    console.log('🚀 Starting Full Automation Pipeline');
    console.log('═'.repeat(50));
    console.log(`User ID: ${userId}`);
    console.log(`Options:`);
    console.log(`  - Max Jobs: ${options.maxJobs}`);
    console.log(`  - Match Threshold: ${options.matchThreshold}`);
    console.log(`  - Tailor Resume: ${options.tailorResume}`);
    console.log(`  - Upload to Profile: ${options.uploadToProfile}`);
    console.log(`  - Skip Auth: ${options.skipAuth}`);
    console.log('═'.repeat(50));
    console.log('');

    const pipeline = new FullAutomationPipeline();

    // Track progress
    const statusInterval = setInterval(() => {
      const status = pipeline.getStatus();
      if (status.currentStep) {
        console.log(`⏳ Current step: ${status.currentStep}`);
        console.log(`   Jobs scraped: ${status.jobsScraped}`);
        console.log(`   Jobs rated: ${status.jobsRated}`);
        console.log(`   Jobs applied: ${status.jobsApplied}`);
        console.log(`   Resumes tailored: ${status.resumesTailored}`);
      }
    }, 5000);

    // Run pipeline
    const result = await pipeline.runFullPipeline(userId, options);

    clearInterval(statusInterval);

    console.log('');
    console.log('═'.repeat(50));
    console.log('✅ Pipeline Completed!');
    console.log('═'.repeat(50));
    console.log('📊 Results:');
    console.log(`  Jobs Scraped: ${result.jobsScraped}`);
    console.log(`  Jobs Rated: ${result.jobsRated}`);
    console.log(`  Jobs Applied: ${result.jobsApplied}`);
    console.log(`  Resumes Tailored: ${result.resumesTailored}`);

    if (result.errors.length > 0) {
      console.log('');
      console.log('⚠️  Errors encountered:');
      result.errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log('');
    console.log('✨ Done! Check your Naukri profile for updates.');
    process.exit(0);
  } catch (error) {
    logger.error('Pipeline execution failed', { error });
    console.error('');
    console.error('❌ Pipeline Failed!');
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
