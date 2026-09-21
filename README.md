# BhaiDekhLe — Distributed Naukri Job Scraper

> **Version:** `1.1.0`  
> **Status:** Production-Ready Distributed Architecture  
> **Runtime:** Node.js (ESM) + TypeScript 7 + Express 5 + RabbitMQ + Playwright Stealth + MongoDB

BhaiDekhLe is an enterprise-grade, distributed scraping pipeline designed to scrape, filter, and ingest tech job listings from [Naukri.com](https://www.naukri.com) at high throughput while bypassing anti-bot protections (Cloudflare / reCAPTCHA) with stealth browser automation and RabbitMQ-backed worker orchestration.

---

## 🚀 Key Highlights in Version 1.1.0

- **Distributed Worker Orchestration (RabbitMQ):** Multi-process consumer workers spawned via Node.js `child_process.fork()`, supervised with IPC readiness handshakes, graceful signal handling, and auto-restart on crashes.
- **Stealth Browser Session Discovery:** Headless Chromium automated via `playwright-extra` and `puppeteer-extra-plugin-stealth` to intercept authentic session cookies, dynamic headers, and API signatures without triggering bot detection.
- **Mathematical Load Partitioning:** Deterministic distribution algorithm (`DistributingWork.ts`) dividing total search pages evenly across active worker processes.
- **High-Throughput HTTP Fetching:** After one-time browser session capture, workers switch to low-footprint HTTP requests, stripping HTTP/2 pseudo-headers and streaming 20 jobs per page.
- **Fault-Tolerant Rate-Limit Recovery:** Specialized `RateLimitError` detection tracking `lastPageCrashed`, relaunching browser environments on block to refresh credentials, and resuming pagination without exponential compounding delay stalls.
- **Automated Filtering & Ingestion:** Strict keyword matching (React.js, JavaScript), 3-day posting recency validation, and idempotent MongoDB deduplication on `jobId`.

---

## 🏗️ Architecture & Pipeline Flow

```
                                  +-----------------------+
                                  |   HTTP Client / API   |
                                  +-----------+-----------+
                                              |
                                     GET /api/v1/job/getAll
                                              |
                                              v
                              +---------------+---------------+
                              |    job.controller.ts          |
                              |    ScheduleScrapping()        |
                              +---------------+---------------+
                                              |
                                              v  (Confirm Channel)
                              +---------------+---------------+
                              |   RabbitMQ Direct Exchange    |
                              |       "TimedScrapping"        |
                              +---------------+---------------+
                                              |
                                              v  Routing Key: "Scrapper"
                              +---------------+---------------+
                              |         RabbitMQ Queue        |
                              |       "TimedScrapping"        |
                              +---------------+---------------+
                                       |             |
                         prefetch(1)   |             |   prefetch(1)
                                       v             v
                           +-----------+---+     +---+-----------+
                           |   worker-1    |     |   worker-2    |  (Spawned by WorkerManager.ts)
                           +-------+-------+     +-------+-------+
                                   |                     |
           +-----------------------+---------------------+-----------------------+
           |                                                                     |
           v (Phase 1: Session Discovery)                                         v (Phase 2: Pagination)
+------------------------------------+                                +------------------------------------+
| CreatingEnviromentToScrap.ts       |                                | GetDesiredJobs.ts                  |
| - Playwright + Stealth Chromium    |                                | - DistributingWork.ts partitions   |
| - Navigates & intercepts search    |                                | - ScrappingPaginatedJob() loop     |
| - Sanitizes headers (no :pseudo)   |                                | - Fetch.ts (HTTP / 429 detection)  |
| - Captures cookies & totalJobs     |                                | - Human randomized delays (1.5-3s) |
| - Closes browser gracefully        |                                +------------------+-----------------+
+------------------------------------+                                                   |
                                                                                         v (Phase 3: Filtering)
                                                                      +------------------------------------+
                                                                      | sortingJobBasedOnCreated.ts        |
                                                                      | - Title: "react" | "javascript"    |
                                                                      | - ValidatingProp.ts: <= 3 days     |
                                                                      +------------------+-----------------+
                                                                                         |
                                                                                         v (Phase 4: Persistence)
                                                                      +------------------------------------+
                                                                      | MongoDB (JobModel)                 |
                                                                      | - Indexed unique "jobId"           |
                                                                      +------------------------------------+
```

---

## 📂 Repository Structure

```
Backend/
├── src/
│   ├── index.ts                              # Server entry point (Express + MongoDB + WorkerManager)
│   ├── app.ts                                # Express setup (CORS, body parsers, routes, liveness probe)
│   ├── constants.ts                          # URLs, RabbitMQ exchange names, DB names, retries
│   ├── types.ts                              # Shared TypeScript types & interfaces
│   │
│   ├── config/
│   │   ├── load-env.ts                       # Path-independent dotenv configuration
│   │   ├── naukri-answers.json               # Naukri form auto-fill data
│   │   └── naukri-selectors.json             # Naukri DOM selector mappings
│   │
│   ├── controllers/
│   │   └── job.controller.ts                 # Express route controllers (getAllJobs, createJob)
│   │
│   ├── db/
│   │   └── MongoDb.ts                        # Mongoose connection with error handling
│   │
│   ├── helpers/
│   │   ├── ScrappingPaginatedJob.ts          # Single-page pagination execution & rate-limit translation
│   │   ├── Playwright/
│   │   │   ├── interceptingBrowsersHttpCommunication.ts  # Network event interception
│   │   │   ├── sanitizeCaptureHeaderUrl.ts   # Strips HTTP/2 pseudo-headers (:authority, :path)
│   │   │   └── setIterativePaginationParams.ts # Mutates URL searchParams (pageNo, noOfResults)
│   │   └── RMQ/
│   │       └── DistributingWork.ts           # Math partitioner dividing page ranges per worker ID
│   │
│   ├── middlewares/
│   │   └── error.middleware.ts               # JSON error & 404 response handlers
│   │
│   ├── models/
│   │   └── Mongo/
│   │       ├── job.models.ts                 # Mongoose schema for unique Job listings
│   │       └── user.models.ts                # User schema (auth, resume storage, preferences)
│   │
│   ├── routes/
│   │   └── job.routes.ts                     # /api/v1/job route definitions
│   │
│   ├── services/
│   │   ├── Scrapper.ts                       # Scraper orchestrator with block recovery loop
│   │   ├── GetDesiredJobs.ts                 # Worker pagination runner across assigned page range
│   │   ├── Playwright/
│   │   │   └── CreatingEnviromentToScrap.ts  # Playwright stealth launcher & session extractor
│   │   └── RMQ/
│   │       ├── WorkerManager.ts              # Master process supervisor for child worker processes
│   │       ├── Producer/
│   │       │   └── ScheduleScrape.ts         # RabbitMQ producer publishing scraping tasks
│   │       └── consumer/
│   │           └── ScheduleScrapWorker.ts    # Child worker consumer listening to queue
│   │
│   ├── utility/
│   │   ├── ApiError.ts                       # Standard operational API error class
│   │   ├── ApiResponse.ts                    # Standard API response formatting wrapper
│   │   ├── AsyncHandler.ts                   # Async controller wrapper for Express
│   │   ├── AsyncHandlerContentWrapper.ts     # Generic try/catch utility wrapper
│   │   ├── EndpointRequestBodyValidation.ts  # Body validation helper
│   │   ├── Fetch.ts                          # Resilient fetch utility (detects 429, 406 Recaptcha, HTML)
│   │   ├── Logger.ts                         # Winston multi-transport logger
│   │   ├── RateLimitingError.ts              # Custom error storing lastPage for seamless retry
│   │   ├── ValidatingProp.ts                 # Posting age filter (<= 3 days)
│   │   ├── sortingJobBasedOnCreated.ts       # Title keyword filter & createdDate sorter
│   │   ├── playwright/
│   │   │   └── ComposeUrl.ts                 # Builds Naukri search query URL
│   │   └── workers/
│   │       ├── killAllWorker.ts              # Graceful child process cleanup utility
│   │       └── shutdown.ts                   # Process signal listener (SIGINT / SIGTERM)
│   │
│   └── Learn/                                # Playwright exercises & learning sandbox
│
├── logs/                                     # Winston logs (error.log, combined.log, playwright.log)
├── package.json                              # Project dependencies & scripts (v1.1.0)
├── tsconfig.json                             # TypeScript compiler configuration
└── playwright.config.ts                      # Playwright test config
```

---

## 🛠️ Technology Stack

| Domain               | Technology                       | Version               | Purpose                                       |
| :------------------- | :------------------------------- | :-------------------- | :-------------------------------------------- |
| **Language**         | TypeScript                       | `7.0.2`               | Strong type safety & modern ES syntax         |
| **Runtime**          | Node.js                          | `>= 18`               | ESM-native server environment                 |
| **Framework**        | Express                          | `5.2.1`               | REST API routing and middleware               |
| **Message Broker**   | RabbitMQ (`amqplib`)             | `^2.0.1`              | Asynchronous task queue & worker distribution |
| **Automation**       | Playwright + Playwright Extra    | `^1.62.1`             | Headless Chromium automation                  |
| **Anti-Bot Stealth** | `puppeteer-extra-plugin-stealth` | `^2.11.2`             | Bypasses Cloudflare & Naukri bot detection    |
| **Database**         | MongoDB + Mongoose               | `^9.9.5`              | Job data persistence & indexing               |
| **Execution**        | tsx + nodemon                    | `^4.20.6` / `^3.1.14` | Hot-reloading TypeScript execution            |
| **Logging**          | Winston                          | `^3.19.0`             | Production file and console log transports    |

---

## ⚙️ How It Works: Step-by-Step

### 1. Master Server & Worker Bootstrapping

When the application starts (`npm run dev`):

1. Connects to MongoDB.
2. `WorkerManager.ts` tears down any orphaned workers and forks `SCRAP_WORKER_COUNT` (default: 2 to 4) isolated child processes (`ScheduleScrapWorker.ts`).
3. Each worker process connects to RabbitMQ, binds to the `TimedScrapping` queue with `prefetch(1)`, and emits an IPC `{ type: "ready" }` signal to the parent.
4. The master server logs: `"All workers listening Queue messages"`.

### 2. Job Scraping Trigger

A client or cron job sends a request to `GET /api/v1/job/getAll`:

1. `job.controller.ts` calls `ScheduleScrapping()`.
2. The producer connects to RabbitMQ, creates a confirmation channel, asserts the `TimedScrapping` direct exchange, and publishes worker task messages with `persistent: true`.
3. The HTTP endpoint immediately returns `200 OK`, allowing scraping to proceed asynchronously in the background.

### 3. Session Discovery via Stealth Playwright

When a worker receives a scrape message:

1. It invokes `Scrapper(workerId)`.
2. `CreatingEnviromentToScrap()` launches an isolated headless Chromium instance with stealth evasions enabled (`--no-sandbox`, `--start-minimized`).
3. It navigates to the Naukri job search page, intercepts the first `/jobapi/v3/search` request, and captures:
   - Target API endpoint URL.
   - Authentication & session headers (stripping HTTP/2 pseudo headers).
   - Initial JSON response (total available jobs count and page 1 results).
4. The browser is closed immediately to save CPU and memory.

### 4. Mathematical Work Distribution

`DistributingWork.ts` determines each worker's exact slice of pages:
$$\text{totalPages} = \lceil \frac{\text{totalJobs}}{20} \rceil - 1$$
Workers partition the total pages deterministically using their numeric worker index (e.g., `worker-1` handles pages 2–1043, `worker-2` handles pages 1044–2085).

### 5. High-Speed Paginated Fetching & Resumption

1. The worker iterates across its assigned page range using `GetAllJobs()` (`Fetch.ts`).
2. Each request is spaced with a randomized human-like jitter (1.5s to 3.5s).
3. **If blocked (HTTP 429 or 406 Recaptcha)**:
   - `Fetch.ts` fast-fails by throwing `RECAPTCHA_BLOCK`.
   - `Scrapper.ts` catches `RateLimitError` and preserves `lastPageCrashed`.
   - The worker takes a fixed 1-second breather, relaunches a fresh stealth browser session to acquire new cookies/tokens, and **resumes directly from `lastPageCrashed`**.

### 6. Ingestion & Filtering

1. Raw jobs are passed through `sortingUnsortedJobBasedOnTimeCreated()`:
   - Filters job titles for target keywords (e.g., "React", "JavaScript").
   - Validates that listings were posted within the last 3 days (`ValidatingProp.ts`).
   - Sorts chronologically by `createdDate`.
2. Filtered listings are deduplicated and saved to MongoDB via `jobId`.

---

## 🚦 Environment Configuration (`.env`)

Create a `.env` file in the `Backend/` directory:

```env
# Server
PORT=8000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net
# MONGO_DB_NAME defaults to "BhaiDekhLe" in constants.ts

# Frontend / CORS
FRONTEND_URL=http://localhost:5173

# RabbitMQ (Local or CloudAMQP)
RABBITMQ_URL_WITH_CREDENTIALS="amqps://<user>:<password>@<host>/<vhost>"

# Worker Configuration
SCRAP_WORKER_COUNT=2
WORKER_ID="worker-1"

# AI Integration (Optional)
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js**: `v18.x` or higher
- **MongoDB**: Local or hosted MongoDB Atlas instance
- **RabbitMQ**: Local RabbitMQ broker or hosted CloudAMQP instance

### 2. Install Dependencies & Playwright

```bash
cd Backend
npm install

# Install Playwright Chromium binaries
npm run playwright:install
```

### 3. Run Development Server

```bash
npm run dev
```

You will see:

```text
Server is running on 8000
MongoDB connected
worker-1 is ready
worker-2 is ready
All workers listening Queue messages
```

### 4. Trigger Scraping Pipeline

```bash
# Trigger asynchronous distributed scraping
curl -X GET http://localhost:8000/api/v1/job/getAll

# Check server health
curl -X GET http://localhost:8000/api/v1/test
```

---

## 📡 API Reference

### Jobs API

| Method | Endpoint             | Description                                       | Response            |
| :----- | :------------------- | :------------------------------------------------ | :------------------ |
| `GET`  | `/api/v1/job/getAll` | Triggers distributed scrape pipeline via RabbitMQ | `{ success: true }` |

### System Health

| Method | Endpoint       | Description                            | Response                                         |
| :----- | :------------- | :------------------------------------- | :----------------------------------------------- |
| `GET`  | `/api/v1/test` | Liveness probe returning server uptime | `{ success: true, status: "ok", uptime: 124.5 }` |

---

## 📋 Database Schema (`JobModel`)

```typescript
interface JOB_DETAILS {
  title: string; // e.g., "Senior React Developer"
  jobId: string; // Unique Naukri job ID (Unique Index)
  footerPlaceholderLabel: string; // e.g., "1 Day Ago"
  companyName: string; // e.g., "Tech Corp"
  tagsAndSkills: string[]; // e.g., ["React.js", "TypeScript", "Redux"]
  placeholders: Record<string, string>[]; // Experience, Salary, Location
  jdURL: string; // Direct job detail URL
  JD: string; // Full job description HTML/text
  createdDate: number; // Unix timestamp
  salaryDetails: Record<string, unknown>;
  minExp: string; // Minimum experience (years)
  maxExp: string; // Maximum experience (years)
  applyByTime: string; // Application deadline string
  walkIn: boolean; // Walk-in interview flag
  createdAt: Date; // Auto-managed timestamp
  updatedAt: Date; // Auto-managed timestamp
}
```

---

## 📜 NPM Scripts

| Command                      | Description                                          |
| :--------------------------- | :--------------------------------------------------- |
| `npm run dev`                | Starts server with nodemon + tsx hot-reloading       |
| `npm run build`              | Compiles TypeScript to JavaScript in `dist/`         |
| `npm start`                  | Runs compiled production server from `dist/index.js` |
| `npm run playwright:install` | Downloads Chromium browser binary for Playwright     |

---

## 🏷️ Version Changelog

### Version `1.1.0` (Current)

- **RabbitMQ Worker Cluster**: Process supervision via `WorkerManager` spawning child worker processes with IPC and crash auto-recovery.
- **Stealth Browser Automation**: Integrated `playwright-extra` + `puppeteer-extra-plugin-stealth` to evade bot detection.
- **Mathematical Page Partitioning**: Implemented `DistributingWork.ts` to assign non-overlapping page slices per worker.
- **Optimized Recovery**: Eliminated escalating $10\text{s} \times \text{attempt}$ wait times in `Scrapper.ts` in favor of a constant 1-second breather with instant browser session renewal.
- **Fast-Fail Recaptcha Detection**: Enhanced `Fetch.ts` to fast-fail on HTTP 406 / recaptcha blocks, preventing wasted retry loops with invalidated sessions.

### Version `1.0.0`

- Initial Express + MongoDB API.
- Basic Playwright session interception.
- Synchronous pagination and keyword filtering.

---

## 👤 Author

**Sachin Singh Patwal**  
GitHub: [@SachinSinghPatwal](https://github.com/SachinSinghPatwal)

---

## 📄 License

ISC License
