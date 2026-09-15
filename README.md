# BhaiDekhLe — Naukri Job Scrapper

A backend service that scrapes [Naukri.com](https://www.naukri.com) job listings using Playwright for session discovery, then paginates through results via direct HTTP requests. Jobs are filtered by title keywords and recency before being returned through a REST API.

---

## 🏗️ Architecture Overview

```
Backend/
├── src/
│   ├── index.ts                              # Server entry point (Express + MongoDB)
│   ├── app.ts                                # Express app setup (CORS, routes, error handlers)
│   ├── constants.ts                          # Naukri search URL composition & DB name
│   │
│   ├── config/
│   │   ├── load-env.ts                       # dotenv loader (path-independent)
│   │   ├── naukri-answers.json               # Naukri form auto-fill answers
│   │   └── naukri-selectors.json             # Naukri page CSS selectors
│   │
│   ├── controllers/
│   │   └── job.controller.ts                 # Route handlers (createJob, getAllJobs, etc.)
│   │
│   ├── db/
│   │   └── MongoDb.ts                        # Mongoose connection
│   │
│   ├── helpers/
│   │   └── Playwright/
│   │       ├── sanitizeCaptureHeaderUrl.ts    # Strips HTTP/2 pseudo-headers
│   │       └── setIterativePagiantionParams.ts # Sets pageNo & noOfResults on URL
│   │
│   ├── middlewares/
│   │   └── error.middleware.ts               # JSON error handler + 404 catch-all
│   │
│   ├── models/
│   │   └── Mongo/
│   │       ├── job.models.ts                 # Job schema (title, skills, salary, etc.)
│   │       └── user.models.ts                # User schema (auth, resume, preferences)
│   │
│   ├── routes/
│   │   └── job.routes.ts                     # /api/v1/job/* route definitions
│   │
│   ├── services/
│   │   ├── Scrapper.ts                       # Playwright browser → captures first API request → hands off to HTTP pagination
│   │   └── GetDesiredJobs.ts                 # Paginates up to 40 pages, filters by title & recency
│   │
│   ├── utility/
│   │   ├── ApiError.ts                       # Custom error class with status code
│   │   ├── ApiResponse.ts                    # Standard success response wrapper
│   │   ├── AsyncHandler.ts                   # Express async error-catching wrapper
│   │   ├── AsyncHandlerContentWrapper.ts     # Generic try/catch wrapper for async ops
│   │   ├── EndpointRequestBodyValidation.ts  # Request body empty-field validator
│   │   ├── Fetch.ts                          # HTTP fetch wrapper for Naukri's job API
│   │   ├── Logger.ts                         # Winston logger (file + console transports)
│   │   ├── ValidatingProp.ts                 # Filters jobs posted within 3 days
│   │   └── playwright/
│   │       └── ComposeUrl.ts                 # Builds the initial Naukri search URL
│   │
│   └── Learn/                                # Playwright learning exercises (Phase1–Phase8)
│
├── logs/                                     # Winston log output (error, combined, playwright)
├── Dockerfile
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

---

## ⚙️ How It Works

1. **Session Discovery** — `Scrapper.ts` launches a Playwright Chromium instance, navigates to Naukri, and intercepts the first `/jobapi/v3/search` network request to capture the URL and auth headers.

2. **Paginated Fetching** — `GetDesiredJobs.ts` replays that request via `fetch()` across up to 40 pages (20 results per page), collecting all job listings.

3. **Filtering** — Jobs are filtered by:
   - **Title keywords**: must contain "react" or "javascript"
   - **Recency**: must have been posted within the last 3 days (`ValidatingProp.ts`)

4. **Response** — Filtered jobs are returned as JSON through the Express API.

---

## 🛠️ Technology Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Runtime    | Node.js + TypeScript 7              |
| Framework  | Express 5                           |
| Database   | MongoDB + Mongoose 9                |
| Automation | Playwright 1.62 (Chromium)          |
| Auth       | JWT + bcrypt                        |
| Logging    | Winston (file + console transports) |
| Build      | tsx (dev) / tsc (production)        |

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 18
- MongoDB instance (local or cloud)

### Installation

```bash
cd Backend
npm install

# Install Playwright's Chromium browser
npm run playwright:install

# Set up environment
cp .env.example .env
# Edit .env with your actual values
```

### Environment Variables

```env
# Server
PORT=8000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/

# Frontend (CORS origin)
FRONTEND_URL=http://localhost:3000

# JWT
ACCESS_TOKEN_SECRET=your_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_secret
REFRESH_TOKEN_EXPIRY=7d

# Logging
LOG_LEVEL=info
```

### Run

```bash
npm run dev
```

Server starts on `http://localhost:8000`.

---

## 📡 API Endpoints

### Jobs

| Method   | Path                 | Description                   |
| -------- | -------------------- | ----------------------------- |
| `GET`    | `/api/v1/job/getAll` | Scrape & return filtered jobs |
| `POST`   | `/api/v1/job/create` | Create a job record           |
| `GET`    | `/api/v1/job/:id`    | Get job by ID                 |
| `PUT`    | `/api/v1/job/:id`    | Update job                    |
| `DELETE` | `/api/v1/job/:id`    | Delete job                    |

### Health

| Method | Path           | Description                      |
| ------ | -------------- | -------------------------------- |
| `GET`  | `/api/v1/test` | Liveness probe (uptime + status) |

### Example

```bash
# Check server is alive
curl http://localhost:8000/api/v1/test

# Scrape and fetch filtered Naukri jobs
curl http://localhost:8000/api/v1/job/getAll
```

---

## 📊 Database Schemas

### Job Model

```typescript
{
  title: string              // Job title
  jobId: string              // Naukri job ID
  footerPlaceholderLabel: string  // e.g. "1 Day Ago"
  companyName: string
  tagsAndSkills: string[]    // e.g. ["React.js", "TypeScript"]
  placeholders: object[]     // Experience, salary, location
  jdURL: string              // Naukri job detail URL
  JD: string                 // Full job description
  createdDate: number        // Unix timestamp
  salaryDetails: object
  minExp: string
  maxExp: string
  applyByTime: string
  walkIn: boolean
}
```

### User Model

```typescript
{
  username: string
  email: string
  fullname: string
  password: string           // bcrypt hashed
  refreshToken?: string
  naukriStorageState?: string
  resume?: {
    path?: string
    cloudinaryUrl?: string
    cloudinaryId?: string
    fileName?: string
    mimeType?: string
    uploadedAt?: Date
    storage?: "local" | "cloudinary"
  }
  jobPreferences?: {
    keywords: string[]
    locations: string[]
    minSalary: number
    jobTypes: ("full-time" | "part-time" | "contract" | "internship")[]
    employType: ("remote" | "on-site" | "hybrid")[]
  }
}
```

---

## 📁 NPM Scripts

| Script                       | Description                         |
| ---------------------------- | ----------------------------------- |
| `npm run dev`                | Start dev server with tsx + nodemon |
| `npm run build`              | Compile TypeScript to `dist/`       |
| `npm start`                  | Run compiled production build       |
| `npm run playwright:install` | Install Chromium for Playwright     |
| `npm run test:playwright`    | Run Playwright tests                |

---

## 📝 Logging

Winston writes to three log files in `Backend/logs/`:

| File             | Content                     |
| ---------------- | --------------------------- |
| `error.log`      | Error-level entries only    |
| `combined.log`   | All log levels              |
| `playwright.log` | Debug-level automation logs |

Console output is enabled in development (`NODE_ENV !== 'production'`).

---

## 📚 Learning Resources

Playwright learning exercises are in `Backend/src/Learn/Phase1` through `Phase8`.

---

## 👤 Author

**Sachin Singh Patwal**

---

## 📄 License

ISC

---

**Last Updated**: 2026-09-13
