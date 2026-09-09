# 🚀 Full Automation Pipeline Guide

## What It Does

The **Full Automation Pipeline** is the ultimate one-command solution that orchestrates the entire job application workflow:

```
🔐 Authenticate → 🔍 Scrape Jobs → ⭐ Rate with AI → ✏️ Tailor Resume → 📤 Upload Profile → ✅ Apply
```

**One command runs everything!**

---

## Quick Start (30 seconds)

### Via CLI Script
```bash
npm run automation:full -- <24-character-mongodb-user-id>
```

### Via API
```bash
curl -X POST http://localhost:8000/api/v1/automation/full \
  -H "Content-Type: application/json" \
  -d '{"maxJobs": 50, "matchThreshold": 70}'
```

---

## What Happens Step by Step

### Step 1: Authentication (your pace)
- Checks if you have valid Naukri session stored
- If not, opens a headed browser and waits until you complete the manual login
- Supports OTP and CAPTCHA steps; press Ctrl+C to cancel
- Session encrypted and saved to MongoDB

### Step 2: Job Scraping (5-10 min)
- Scrapes job listings based on your preferences
- Extracts title, company, location, salary, description
- Stores in MongoDB with status: `pending`

### Step 3: AI Rating (2-5 min)
- Loads your original resume
- Gemini AI rates each job: 0-100 score
- Filters jobs above your threshold (default: 70)
- Only high-quality matches proceed

### Step 4: Resume Tailoring (3-10 min)
- For each matching job, Gemini customizes your resume
- Highlights relevant skills from job description
- Incorporates important keywords naturally
- Keeps all facts accurate (no fabrication)
- Saves tailored versions in `Backend/uploads/resumes/{userId}/tailored/`

### Step 5: Profile Upload (2-5 min)
- Uploads best-matched tailored resume to your Naukri profile
- Updates the "My Resume" section
- Profile always shows your most relevant resume

### Step 6: Auto-Apply (5-15 min)
- Opens Naukri with authenticated session
- Applies to qualifying jobs automatically
- Updates application status for each job
- Handles Easy Apply flows

**Total Time: 20-50 minutes for 50 jobs**

---

## CLI Usage

### Basic (all defaults)
```bash
npm run automation:full -- <24-character-mongodb-user-id>
```

### With Custom Options
```bash
npm run automation:full -- <24-character-mongodb-user-id> [options]
```

**Available Options:**
```
--skip-auth              Skip authentication (use existing session)
--max-jobs=N            Maximum jobs to scrape (default: 50)
--threshold=N           Match score threshold 0-100 (default: 70)
--no-tailor             Skip resume tailoring
--no-upload             Skip uploading resume to profile
```

### Examples

**Conservative: High quality matches only**
```bash
npm run automation:full -- <24-character-mongodb-user-id> --max-jobs=20 --threshold=85
```

**Aggressive: Apply to more jobs**
```bash
npm run automation:full -- <24-character-mongodb-user-id> --max-jobs=100 --threshold=60
```

**Fast: Skip resume tailoring**
```bash
npm run automation:full -- <24-character-mongodb-user-id> --no-tailor --no-upload
```

**Resume test: Tailor but don't apply**
```bash
npm run automation:full -- <24-character-mongodb-user-id> --no-upload
```

---

## API Usage

### Endpoint
```
POST /api/v1/automation/full
```

### Request Body
```json
{
  "skipAuth": false,
  "maxJobs": 50,
  "matchThreshold": 70,
  "tailorResume": true,
  "uploadToProfile": true
}
```

### Response
```json
{
  "success": true,
  "data": {
    "currentStep": "completed",
    "completed": true,
    "jobsScraped": 45,
    "jobsRated": 45,
    "jobsApplied": 28,
    "resumesTailored": 5,
    "errors": []
  },
  "message": "Full automation pipeline completed"
}
```

### cURL Examples

**Default settings**
```bash
curl -X POST http://localhost:8000/api/v1/automation/full \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Custom threshold and jobs**
```bash
curl -X POST http://localhost:8000/api/v1/automation/full \
  -H "Content-Type: application/json" \
  -d '{
    "maxJobs": 30,
    "matchThreshold": 75,
    "tailorResume": true,
    "uploadToProfile": true
  }'
```

**Skip auth (reuse session)**
```bash
curl -X POST http://localhost:8000/api/v1/automation/full \
  -H "Content-Type: application/json" \
  -d '{"skipAuth": true}'
```

---

## Configuration

### Environment Variables
```env
# Core
GEMINI_API_KEY=your_key
MONGODB_URI=your_connection

# Playwright
PLAYWRIGHT_HEADLESS=false
JOB_MATCH_THRESHOLD=70

# Resume
RESUME_UPLOAD_PATH=./uploads/resumes
```

### Job Preferences (Optional)
Set in your user profile for smart filtering:
```json
{
  "keywords": ["Node.js", "TypeScript", "Backend"],
  "locations": ["Remote", "Bangalore"],
  "minSalary": 500000,
  "jobTypes": ["full-time"],
  "employType": ["remote"]
}
```

---

## How Resume Tailoring Works

### Original Resume
```
JOHN DOE
Software Developer with 2 years experience
- JavaScript, Node.js, React
- REST API development
- Database design
```

### For "Backend Engineer" Job
```
JOHN DOE
Backend Engineer with 2 years experience
- Node.js, Express, API Development
- REST API architecture and design
- MongoDB and PostgreSQL
- Microservices design patterns
```

### For "React Developer" Job
```
JOHN DOE
Frontend Engineer with 2 years experience
- React, JavaScript, Component design
- State management and hooks
- REST API integration
- Performance optimization
```

**Key Features:**
- ✅ Accurate facts preserved
- ✅ Keywords aligned with job description
- ✅ Skills reordered by relevance
- ✅ No fabricated experience
- ✅ Professional formatting maintained

---

## Monitoring Progress

### Via CLI
The script prints live progress:
```
🚀 Starting Full Automation Pipeline
==================================================
User ID: <24-character-mongodb-user-id>
Options:
  - Max Jobs: 50
  - Match Threshold: 70
  - Tailor Resume: true
  - Upload to Profile: true
  - Skip Auth: false
==================================================

⏳ Current step: scraping
   Jobs scraped: 0
   Jobs rated: 0
   Jobs applied: 0
   Resumes tailored: 0

... [updates every 5 seconds]

✅ Pipeline Completed!
==================================================
📊 Results:
  Jobs Scraped: 45
  Jobs Rated: 45
  Jobs Applied: 28
  Resumes Tailored: 5

✨ Done! Check your Naukri profile for updates.
```

### Via API
Poll the status endpoint (if implemented in your API):
```bash
curl http://localhost:8000/api/v1/automation/status
```

### Via Logs
Check detailed logs:
```bash
tail -f Backend/logs/combined.log
tail -f Backend/logs/playwright.log
```

---

## File Structure After Running

After running the pipeline, your filesystem will have:

```
Backend/
├── uploads/resumes/
│   └── <userId>/
│       ├── resume.txt                    # Original uploaded resume
│       └── tailored/
│           ├── resume-backend-engineer-1694258400000.txt
│           ├── resume-full-stack-1694258410000.txt
│           └── resume-profile-general-1694258420000.txt
│
├── logs/
│   ├── combined.log                      # All events
│   ├── error.log                         # Errors only
│   └── playwright.log                    # Browser automation events
```

**Database Changes:**
```
Job collection gets updated with:
- geminiScore (0-100)
- geminiReasoning (why match matters)
- applicationStatus (applied/skipped/failed)
- appliedAt (timestamp)
- tailoredResumePath (path to customized resume)

User profile updated with:
- naukriStorageState (encrypted session - if re-authenticated)
```

---

## Best Practices

### 1. Start with Test Run
```bash
npm run automation:full -- <24-character-mongodb-user-id> --max-jobs=5 --threshold=80
```
Run with few jobs and high threshold to verify everything works.

### 2. Monitor First Run
Run during a time when you can watch the browser interact with Naukri.

### 3. Adjust Threshold
- **90+**: Only excellent matches (conservative)
- **70-80**: Good matches (recommended)
- **50-70**: More applications (higher risk of irrelevant)

### 4. Update Resume Regularly
```bash
curl -X POST http://localhost:8000/api/v1/users/<userId>/resume \
  -F "resume=@updated-resume.txt"
```

### 5. Schedule Regular Runs
```bash
# Run daily at 9 AM
0 9 * * * cd Backend && npm run automation:full <userId>
```

### 6. Review Tailored Resumes
Check tailored resumes before profile upload:
```bash
ls -la Backend/uploads/resumes/<userId>/tailored/
cat Backend/uploads/resumes/<userId>/tailored/resume-*.txt
```

---

## Troubleshooting

### Browser doesn't open for auth
```bash
# Check PLAYWRIGHT_HEADLESS setting
grep PLAYWRIGHT_HEADLESS Backend/.env

# Should be: PLAYWRIGHT_HEADLESS=false
```

### Gemini API errors
```bash
# Check API key is valid
grep GEMINI_API_KEY Backend/.env

# Verify quota at: https://makersuite.google.com/app/apikey
```

### Resume upload fails
- File must exist at path shown
- Resume must be .txt (PDF not supported yet)
- Naukri UI may have changed selectors

### Jobs not being applied
- Check threshold isn't too high
- Verify resume was uploaded
- Check Gemini scores in logs

---

## Expected Output Example

```bash
$ npm run automation:full -- <24-character-mongodb-user-id> --max-jobs=20 --threshold=75

🚀 Starting Full Automation Pipeline
==================================================
User ID: <24-character-mongodb-user-id>
Options:
  - Max Jobs: 20
  - Match Threshold: 75
  - Tailor Resume: true
  - Upload to Profile: true
  - Skip Auth: false
==================================================

⏳ Current step: authenticating
   Jobs scraped: 0
   Jobs rated: 0
   Jobs applied: 0
   Resumes tailored: 0

⏳ Current step: scraping
   Jobs scraped: 18
   Jobs rated: 0
   Jobs applied: 0
   Resumes tailored: 0

⏳ Current step: rating_jobs
   Jobs scraped: 18
   Jobs rated: 18
   Jobs applied: 0
   Resumes tailored: 0

⏳ Current step: tailoring_resumes
   Jobs scraped: 18
   Jobs rated: 18
   Jobs applied: 0
   Resumes tailored: 3

⏳ Current step: updating_profile
   Jobs scraped: 18
   Jobs rated: 18
   Jobs applied: 0
   Resumes tailored: 3

⏳ Current step: applying
   Jobs scraped: 18
   Jobs rated: 18
   Jobs applied: 12
   Resumes tailored: 3

===================================================
✅ Pipeline Completed!
===================================================
📊 Results:
  Jobs Scraped: 18
  Jobs Rated: 18
  Jobs Applied: 12
  Resumes Tailored: 3

✨ Done! Check your Naukri profile for updates.
```

---

## Next Steps

1. **First Run**: Test with 5 jobs and high threshold
2. **Verify Results**: Check Naukri profile for applied jobs
3. **Check Tailored Resumes**: Review generated resumes
4. **Fine-tune Threshold**: Adjust based on results
5. **Schedule Recurring**: Set up daily or weekly automation
6. **Monitor Success**: Track application responses

---

## Support

- 📋 Check logs: `Backend/logs/combined.log`
- 🔍 Debug selectors: `Backend/src/config/naukri-selectors.json`
- 🤖 Adjust Gemini prompts: `ResumeTailoringService.ts`
- 📚 Full docs: See README.md

---

**Happy Automated Job Hunting! 🚀**
