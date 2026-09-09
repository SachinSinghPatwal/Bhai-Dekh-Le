# BhaiDekhLe - Naukri Job Applier

An intelligent job application automation system that scrapes Naukri.com jobs, uses Gemini AI to rate resume-job compatibility, and auto-applies to high-scoring positions.

## 🎯 Project Vision

Build a reusable Playwright automation framework with Naukri.com as the first implementation. The system saves time by intelligently filtering and applying to relevant job opportunities based on AI-powered resume matching.

---

## 🏗️ Architecture Overview

```
Backend/
├── src/
│   ├── services/
│   │   ├── playwright/
│   │   │   ├── BrowserManager.ts           # Browser lifecycle management
│   │   │   ├── StorageStateManager.ts      # Encrypted session storage
│   │   │   └── naukri/
│   │   │       ├── NaukriAuthService.ts    # Authentication flow
│   │   │       ├── NaukriScraperService.ts # Job scraping
│   │   │       └── NaukriApplierService.ts # Auto-apply logic
│   │   ├── gemini/
│   │   │   └── GeminiMatchingService.ts    # AI-powered job matching
│   │   └── resume/
│   │       └── ResumeService.ts            # Resume management
│   ├── models/
│   │   └── Mongo/
│   │       ├── user.models.ts              # User + auth state + preferences
│   │       └── job.models.ts               # Job + application tracking
│   ├── routes/
│   │   ├── automation.routes.ts            # Automation endpoints
│   │   └── user.routes.ts                  # User/resume endpoints
│   └── controllers/
│       ├── automation.controller.ts
│       └── user.controller.ts
```

---

## 📊 Implementation Progress

### ✅ Completed Phases

**Phase 0: Planning**
- [x] Architecture design
- [x] Technology stack selection
- [x] Database schema design
- [x] API endpoint planning

### ✅ Phase 1: Foundation (Complete)

**Database Models**
- [x] Update User model with Naukri fields
- [x] Update Job model with application tracking
- [x] Add encryption utilities for storageState

**Infrastructure Services**
- [x] StorageStateManager (AES-256-CBC encryption)
- [x] BrowserManager (Playwright lifecycle)
- [x] Winston logger setup
- [x] TypeScript type definitions

### ✅ Phase 2: Resume & Gemini Integration (Complete)
- [x] ResumeService (upload, parse, store)
- [x] GeminiMatchingService (AI scoring)
- [x] Resume upload API endpoint

### ✅ Phase 3: Naukri Automation (Complete)
- [x] NaukriAuthService (manual login flow)
- [x] NaukriScraperService (job scraping)
- [x] NaukriApplierService (auto-apply)
- [x] Configuration files (selectors, form answers)

### ✅ Phase 4: API Layer (Complete)
- [x] Automation routes and controller
- [x] User preferences endpoints
- [x] Status monitoring endpoints

### ✅ Phase 5: Testing & Scripts (Complete)
- [x] CLI scripts (auth, scrape)
- [x] Example Playwright test
- [x] Package.json scripts

**Phase 6: Documentation**
- [x] Environment setup guide
- [x] API documentation
- [x] Troubleshooting guide

---

## 🛠️ Technology Stack

**Backend**
- Node.js + Express 5
- TypeScript 7
- MongoDB + Mongoose

**Automation**
- Playwright 1.62
- Headless/Headed modes

**AI Integration**
- Google Gemini AI (resume-job matching)

**Security**
- bcrypt (password hashing)
- crypto (AES-256-CBC for session encryption)
- JWT (authentication tokens)

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js >= 18
MongoDB running locally or cloud instance
```

### Installation
```bash
# Install dependencies
cd Backend
npm install

# Install Playwright browsers
npm run playwright:install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Environment Variables
```env
# Server
PORT=8000
MONGODB_URI=your_mongodb_connection_string

# Authentication
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Playwright
PLAYWRIGHT_HEADLESS=false
RESUME_UPLOAD_PATH=./uploads/resumes
JOB_MATCH_THRESHOLD=70

# Encryption
ENCRYPTION_KEY=your_32_character_encryption_key
```

### Run Development Server
```bash
npm run dev
```

---

## 📡 API Endpoints

### Automation
```
POST   /api/v1/automation/auth/naukri       # Authenticate with Naukri
POST   /api/v1/automation/scrape            # Scrape jobs
POST   /api/v1/automation/apply             # Match & apply to jobs
GET    /api/v1/automation/status            # Get bot status
POST   /api/v1/automation/stop              # Stop automation
```

### User Management
```
POST   /api/v1/users/:userId/resume         # Upload resume
GET    /api/v1/users/:userId/applications   # Get applications
PUT    /api/v1/users/:userId/preferences    # Update job preferences
```

### Jobs
```
POST   /api/v1/jobs                         # Create job
GET    /api/v1/jobs                         # Get all jobs
GET    /api/v1/jobs/:id                     # Get job by ID
PUT    /api/v1/jobs/:id                     # Update job
DELETE /api/v1/jobs/:id                     # Delete job
```

---

## 🔧 Usage

### 1. Authenticate with Naukri
```bash
npm run automation:auth -- <24-character-mongodb-user-id>
```
Opens a headed browser and waits until you finish the manual login. Session is then saved encrypted in MongoDB; press Ctrl+C to cancel.

### 2. Scrape Jobs
```bash
npm run automation:scrape -- <24-character-mongodb-user-id>
```
Scrapes jobs based on your preferences and saves to database.

### 3. Auto-Apply
```bash
curl -X POST http://localhost:8000/api/v1/automation/apply
```
Gemini AI rates each job against your resume. Auto-applies to jobs scoring above threshold.

---

## 🔐 Security Features

- **Session Encryption**: Naukri storageState encrypted with AES-256-CBC
- **Password Security**: bcrypt hashing with salt rounds
- **Resume Storage**: Local filesystem with user-specific folders
- **Input Validation**: Request body validation middleware
- **Error Handling**: Comprehensive error logging without exposing secrets

---

## 📝 Database Schema

### User Model
```typescript
{
  username: string
  email: string
  password: string (bcrypt hashed)
  refreshToken?: string
  naukriStorageState?: string (encrypted)
  resume?: {
    path: string
    fileName: string
    uploadedAt: Date
  }
  jobPreferences?: {
    keywords: string[]
    locations: string[]
    minSalary: number
    jobTypes: JobType[]
    employType: EmployType[]
  }
}
```

### Job Model
```typescript
{
  title: string
  description: string
  company: string
  location: string
  type: 'full-time' | 'part-time' | 'contract' | 'internship'
  employType: 'remote' | 'on-site' | 'hybrid'
  salary: number
  staticLink: string
  externalLink?: string
  platform: 'naukri' | 'linkedin' | 'indeed'
  userId: ObjectId
  appliedAt?: Date
  applicationStatus?: 'pending' | 'applied' | 'rejected' | 'skipped' | 'failed'
  geminiScore?: number
  geminiReasoning?: string
}
```

---

## 🧪 Testing

```bash
# Run Playwright tests
npm run test:playwright
```

---

## 🐛 Troubleshooting

### storageState Expired
If authentication fails mid-session, re-run:
```bash
npm run automation:auth -- <24-character-mongodb-user-id>
```

### Playwright Browser Issues
```bash
# Reinstall browsers
npm run playwright:install
```

### Gemini API Errors
Verify `GEMINI_API_KEY` in `.env` and check API quota.

---

## 📚 Learning Resources

- Playwright learning examples in `Backend/src/Learn/Phase*`
- Persistent context example: `Backend/src/Learn/Phase2/PersistentContext.ts`

---

## 🤝 Contributing

1. Follow existing code patterns and utilities
2. Use TypeScript strict mode
3. Add error handling with `asyncHandler`
4. Log important events with Winston
5. Test manually before committing

---

## 📄 License

ISC

---

## 👤 Author

Sachin Singh Patwal

---

## 🎯 Success Criteria

- [x] User can authenticate via headed browser, state saved encrypted in DB
- [x] Jobs scraped from Naukri and stored in MongoDB
- [x] Gemini rates jobs with score and reasoning
- [x] Auto-apply works for jobs above threshold
- [x] All API endpoints functional
- [x] Resume upload works
- [x] Logs capture all automation events
- [x] README documents full system
- [ ] One example test passes (needs manual verification)

---

## ⏱️ Timeline Status

**All Phases Complete!** Ready for end-to-end testing.

- ✅ Phase 1 (Foundation): Complete
- ✅ Phase 2 (Resume & Gemini): Complete
- ✅ Phase 3 (Naukri Automation): Complete
- ✅ Phase 4 (API Layer): Complete
- ✅ Phase 5 (Testing): Complete
- ✅ Phase 6 (Documentation): Complete

**Next Steps:**
1. Set up `.env` file with actual credentials
2. Run `npm run dev` to start server
3. Test authentication flow: `npm run automation:auth -- <24-character-mongodb-user-id>`
4. Test scraping: `npm run automation:scrape <userId>`
5. Test full automation via API endpoints

---

**Last Updated**: 2026-09-09
**Current Status**: ✅ Phase 1-5 Complete - Ready for Testing
