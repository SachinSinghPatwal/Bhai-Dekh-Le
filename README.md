# BhaiDekhLe — Distributed Naukri Job Scraper & Ingestion Pipeline

> **Version:** `1.3.0`  
> **Status:** Production-Ready Distributed Micro-Worker Architecture & Automation Pipeline  
> **Runtime:** Node.js (ESM) + TypeScript + Express 5 + RabbitMQ + Playwright Stealth + MongoDB

BhaiDekhLe is an enterprise-grade, distributed scraping and ingestion pipeline designed to scrape, filter, and persist tech job listings from [Naukri.com](https://www.naukri.com) at scale. It circumvents bot detection (Cloudflare / reCAPTCHA) with stealth browser automation and coordinates workloads through a decoupled, multi-tier RabbitMQ worker architecture with automated crash detection, self-healing respawns, and graceful teardowns.

---

## 🚀 Key Highlights

- **Decoupled Two-Tier Queue Pipeline:** Separates CPU/network-intensive scraping from I/O-bound database persistence via dedicated RabbitMQ queues (`TimedScrapping` and `db_save`).
- **Autonomous Worker Supervision:** Child workers spawned via Node.js `child_process.fork()` with IPC readiness handshakes, exit-code monitoring, 3-second crash backoff, and automatic respawning.
- **Ordered Two-Phase Graceful Teardown:** Centralized shutdown protocol that drains and terminates scrapers first before stopping database ingestion workers, preventing data loss.
- **Stealth Browser Session Interception & Auth:** Headless Chromium automated via `playwright-extra` and `puppeteer-extra-plugin-stealth` with automated login support (`Login.ts`) to bypass Cloudflare/Naukri bot protection, capturing authentic session tokens and search headers.
- **Interactive User Profile Onboarding:** Pre-boot interactive terminal CLI (`basicUserInformation.ts`) configuring candidate details, skills, target roles, experience levels, and search filters before workers initialize.
- **Deterministic Load Distribution:** Partitions pagination across active scraper processes using mathematical range splitting (`DistributingWork.ts`).
- **Encrypted Local Snapshot Resilience:** Scraped data caching with AES-256-CBC encryption (`.encrypted.json`) and authenticated decryption for reliable replay and offline tolerance.
- **Lightweight Paginated HTTP Ingestion:** After single-shot browser session extraction, workers switch to high-speed HTTP fetching, sanitizing HTTP/2 pseudo-headers and streaming 20 jobs per page.
- **Atomic Bulk Persistence & Duplicate Handling:** Dedicated database workers consume job batches and execute unordered `insertOne` operations via MongoDB `JobModel.bulkWrite()`, gracefully handling duplicate key collisions (`E11000`) and expiring stale jobs with a 24-hour TTL index.
- **Structured Observability & Fast Tooling:** Centralized Winston structured logging across all processes, backed by high-speed Rust-based Oxlint static analysis.

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
                               |      job.controller.ts        |
                               |      ScheduleScrapping()      |
                               +---------------+---------------+
                                              |
                                              v (Confirm Channel Publish)
                               +---------------+---------------+
                               |  Exchange: "TimedScrapping"   |  (Direct, Durable)
                               +---------------+---------------+
                                              |
                                              v Routing Key: "Scrapper"
                               +---------------+---------------+
                               |    Queue: "TimedScrapping"    |
                               +---------------+---------------+
                                        |             |
                         prefetch(1)    |             |    prefetch(1)
                                        v             v
                               +--------+----+   +----+--------+
                               |  Scraper-1  |   |  Scraper-2  |   (ScrapWorkerManager.ts)
                               +--------+----+   +----+--------+
                                        |             |
                 +----------------------+-------------+-----------------------+
                 |                                                            |
                 v (Phase 1: Stealth Session)                                 v (Phase 2: Partitioned Pagination)
     +----------------------------------+                         +-----------------------------------+
     | CreatingEnviromentToScrap.ts     |                         | GetDesiredJobs.ts                 |
     | - Playwright Stealth Chromium    |                         | - DistributingWork.ts partitions  |
     | - Intercepts /jobapi/v3/search   |                         | - Fetch.ts (HTTP / 429 detection) |
     | - Extracts tokens & totalJobs    |                         | - Random jitter (1.5s - 3.5s)     |
     | - Closes browser instance        |                         +-----------------+-----------------+
     +----------------------------------+                                           |
                                                                                    v (Phase 3: Filter & Format)
                                                                  +-----------------------------------+
                                                                  | sortingJobBasedOnCreated.ts       |
                                                                  | - Keyword: "React" | "Javascript" |
                                                                  | - Recency: <= 3 Days              |
                                                                  +-----------------+-----------------+
                                                                                    |
                                                                                    v (Confirm Channel Publish)
                                                                  +-----------------------------------+
                                                                  |   Exchange: "db_save_exchange"    | (Direct, Durable)
                                                                  +-----------------+-----------------+
                                                                                    |
                                                                                    v Routing Key: "Save"
                                                                  +-----------------------------------+
                                                                  |         Queue: "db_save"          |
                                                                  +-----------------+-----------------+
                                                                           |                 |
                                                            prefetch(1)    |                 |    prefetch(1)
                                                                           v                 v
                                                                  +--------+----+   +--------+----+
                                                                  | DB-Worker-1 |   | DB-Worker-2 | (DbWorkerManager.ts)
                                                                  +--------+----+   +--------+----+
                                                                           |                 |
                                                                           +--------+--------+
                                                                                    | (Phase 4: Bulk Ingestion)
                                                                                    v
                                                                  +-----------------------------------+
                                                                  | MongoDB (JobModel.bulkWrite)      |
                                                                  | - Operation: insertOne (unordered)|
                                                                  | - Deduplication: E11000 bypass    |
                                                                  | - TTL auto-cleanup: 24h index     |
                                                                  +-----------------------------------+
```

---

## 🔄 Two-Tier Queue & Worker Architecture (`Queue + Worker + Work`)

The system separates scraping from database writes into two distinct operational tiers to guarantee non-blocking execution, backpressure isolation, and fault tolerance:

### Tier Overview

| Component | Tier 1: Scraper Queue | Tier 2: Database Persistence Queue |
| :--- | :--- | :--- |
| **Exchange** | `TimedScrapping` (Direct, Durable) | `db_save_exchange` (Direct, Durable) |
| **Queue Name** | `TimedScrapping` | `db_save` |
| **Routing Key** | `Scrapper` | `Save` |
| **Producer** | `ScheduleScrape.ts` (`ScheduleScrapping()`) | `ScheduleScrapWorker.ts` (Scraper Child Process) |
| **Consumer** | `ScheduleScrapWorker.ts` (Scraper Child Process) | `DbWorker.ts` (DB Child Process) |
| **Supervising Manager** | `ScrapWorkerManager.ts` | `DbWorkerManager.ts` |
| **Worker Concurrency** | Configured via `SCRAP_WORKER_COUNT` (default: `4`) | Configured via `DB_WORKER_COUNT` (default: `2`) |
| **Channel QoS** | `channel.prefetch(1)` | `channel.prefetch(1)` |
| **Payload Structure** | Task trigger string (e.g., `scrapping task 1`) | `{ jobs: JOB_DETAILS[] }` (JSON) |
| **Acknowledgment** | ACKs **only** after DB queue confirms receipt | ACKs **only** after `bulkWrite()` succeeds in Mongo |

---

### Work Breakdown Across Tiers

#### 1. Scraping Tier (`ScheduleScrapWorker.ts`)
- **Work Performed:**
  1. Receives a scraping trigger message from the `TimedScrapping` queue.
  2. Spawns an ephemeral stealth Playwright Chromium instance via `CreatingEnviromentToScrap.ts`.
  3. Intercepts the Naukri search API call to extract the request endpoint, dynamic auth cookies, and headers.
  4. Calculates page ranges via `DistributingWork.ts` based on its assigned `workerId` (e.g., `worker-1` vs `worker-2`).
  5. Iterates through paginated endpoints using raw HTTP requests (`Fetch.ts`) with anti-bot randomized jitter.
  6. On rate-limit or captcha challenges (`RateLimitError`), the worker refreshes its browser session and seamlessly resumes from `lastPageCrashed`.
  7. Filters extracted jobs by target skills (e.g. React, JavaScript) and recency (`<= 3 days`).
  8. **The Handoff:**
     - **Connected Mode (Default):** Publishes the filtered job batch `{ jobs: scrapedJobs }` to `db_save_exchange` with routing key `Save` and `persistent: true`. Awaits RabbitMQ confirmation via `channel.waitForConfirms()`. Once confirmed, acknowledges the original scrape task via `channel.ack(message)`.
     - **Offline / Local Mode (`MONGO_URI` undefined):** Automatically bypasses the DB queue, encrypts and persists jobs to `Backend/snapShots`, executes automated 24-hour stale snapshot cleanup, and acknowledges the message.

#### 2. Database Persistence Tier (`DbWorker.ts`)
- **Work Performed:**
  1. Runs as an independent child process with its own isolated connection to MongoDB (`connectToDb.ts`) and RabbitMQ. Suspended automatically if `MONGO_URI` is omitted.
  2. Consumes batches from the `db_save` queue with `prefetch(1)`.
  3. Parses the incoming payload `{ jobs: [...] }`.
  4. Executes high-performance unordered batch insertions using Mongoose:
     ```typescript
     await JobModel.bulkWrite(
       jobs.map((job) => ({
         insertOne: {
           document: job,
         },
       })),
       {
         ordered: false,
       },
     );
     ```
  5. Gracefully absorbs duplicate key collisions (`E11000`), allowing new jobs to persist while skipping existing records without failing.
  6. Acknowledges the message (`channel.ack(message)`) only after the bulk write operation resolves.
  7. On unexpected failures, nacks the message (`channel.nack(message, false, true)`) to trigger retry handling without crashing the scraper pool.

---

## 💀 Worker Death, Crash Detection & Respawn Supervision

Child workers operate under supervisor control. The supervisor isolates crashes, monitors OS process events, and executes automatic self-healing respawns without impacting the parent API server or other workers.

```
+-----------------------------------------------------------------------------------+
|                                  Worker Lifecycle                                 |
+-----------------------------------------------------------------------------------+

     [spawnWorker()]
            |
            v
     +--------------+      IPC: { type: "ready" }       +---------------+
     |  fork() Child +---------------------------------->| Active Worker |
     +------+-------+                                   +-------+-------+
            |                                                   |
   Timeout / Startup Error                               Crash / Exit Event
            |                                                   |
            v                                                   v
     [worker.kill(SIGTERM)]                            [worker.once("exit")]
            |                                                   |
            v                                                   v
     [Throw startup error]                             Remove from workers[]
                                                                |
                                             +------------------+------------------+
                                             |                                     |
                                   isShuttingDown() === true                 code === 0
                                             |                                     |
                                             v                                     v
                                      [Do Not Respawn]                     [Do Not Respawn]
                                             |
                                  code !== 0 / Fatal Crash
                                             |
                                             v
                              Wait WORKER_RESTART_DELAY (3s)
                                             |
                                  isShuttingDown() === false
                                             |
                                             v
                               [spawnWorker() Recurse]
```

### 1. Process Spawning & Isolation (`spawn.ts`)
- Child workers are spawned using Node.js `child_process.fork()` with ESM runtime flags:
  ```typescript
  fork(workerPath, {
    execArgv: ["--import", "tsx"],
    env: { ...process.env, WORKER_ID: workerId },
  });
  ```
- Each child process receives its own dedicated process identifier (`PID`), separate V8 heap, and isolated event loop.

### 2. Readiness Handshake (`readyStatus.ts`)
- After being spawned, the worker establishes its RabbitMQ channel, asserts exchanges/queues, and configures prefetch.
- Once ready to consume messages, the child sends an IPC signal to the parent:
  ```typescript
  process.send({ type: "ready" });
  ```
- The parent supervisor waits up to `WORKER_READY_TIMEOUT = 30_000` (30 seconds) for this signal.
- If the worker fails to send the ready signal within 30 seconds or terminates prematurely, the supervisor sends `SIGTERM` to clean up and throws a startup exception.

### 3. Crash Detection (`worker.once("exit")`)
The parent supervisor binds an `exit` listener to every spawned child process:

```typescript
worker.once("exit", (code, signal) => {
  console.log(`[${workerId}] exited. code=${code}, signal=${signal}`);

  // 1. Instantly remove dead process from the active pool
  const index = workers.indexOf(worker);
  if (index !== -1) {
    workers.splice(index, 1);
  }

  // 2. Suppress restart if manager is in shutdown mode
  if (isShuttingDown()) {
    return;
  }

  // 3. Normal exit (exit code 0) is not considered a crash
  if (code === 0) {
    return;
  }

  // 4. Abnormal exit: schedule delayed respawn
  console.log(`[${workerId}] crashed. Restarting in 3s...`);

  setTimeout(async () => {
    if (isShuttingDown()) return;

    try {
      const respawned = await spawnWorker({
        workerId,
        workerPath,
        workers,
        isShuttingDown,
      });
      console.log(`[${workerId}] restarted. PID=${respawned.pid}`);
    } catch (error) {
      console.error(`[${workerId}] failed to restart:`, error);
    }
  }, WORKER_RESTART_DELAY); // 3,000 ms
});
```

### 4. Decision Matrix: When Workers Respawn vs. Stay Dead

| Condition | Action | Reason |
| :--- | :--- | :--- |
| `isShuttingDown() === true` | **No Respawn** | Manager is intentionally shutting down the application. |
| `code === 0` | **No Respawn** | Worker exited cleanly without errors. |
| `code !== 0` (e.g. `1`, unhandled exception) | **Respawn after 3s** | Worker crashed due to an application or runtime error. |
| Killed by OS signal (e.g., `SIGKILL`, OOM) | **Respawn after 3s** | Worker was killed unexpectedly by the environment or OS. |
| Startup timeout (> 30s before `ready`) | **Termination** | Process failed initialization; parent aborts bootstrap. |

---

## 🛑 Coordinated Two-Phase Graceful Shutdown (`shutdown.ts` & `index.ts`)

When an exit signal (`SIGINT`, `SIGTERM`, `SIGUSR2`) is captured, the application executes a sequential two-phase teardown to prevent in-flight data corruption:

```
[Signal: SIGINT / SIGTERM]
           |
           v
+-------------------------------------------------------------+
| Phase 1: Shutdown Scraper Workers                           |
| - ScrapWorkerManager calls shutdown()                       |
| - Broadcasts SIGTERM to all scraper workers                 |
| - Workers close RabbitMQ channels & connections             |
| - No new scrape payloads can be published to the DB queue   |
+-------------------------------------------------------------+
           |
           v
+-------------------------------------------------------------+
| Phase 2: Shutdown DB Workers                                |
| - DbWorkerManager calls shutdown()                          |
| - Broadcasts SIGTERM to all DB workers                      |
| - DB workers finish current bulkWrite() and ACK             |
| - DB workers close RabbitMQ channel & Mongo connection      |
| - Unacknowledged messages remain safely in RabbitMQ         |
+-------------------------------------------------------------+
           |
           v
[Process Exit: code 0]
```

### Force Kill Fallback (`WORKER_SHUTDOWN_TIMEOUT`)
- The supervisor gives every worker **10 seconds** (`WORKER_SHUTDOWN_TIMEOUT = 10_000`) to finish its current job, close its AMQP channel, close database connections, and exit cleanly.
- If a child process fails to exit within 10 seconds, the supervisor issues `worker.kill("SIGKILL")` to enforce termination without hanging the parent process.

---

## 📂 Repository Structure

```
Backend/
├── data/                                     # Local candidate profile data (gitignored)
│   ├── personalDetails.personal.json         # Terminal-configured candidate information
│   └── userDetails.personal.json             # Synced user preferences and resume links
│
├── snapShots/                                # Encrypted job snapshots (AES-256-CBC)
│   └── DD-MM-YYYY/                           # Date-partitioned snapshot folders (auto-pruned after 24h)
│
├── src/
│   ├── index.ts                              # App entry point, user verification & worker orchestration
│   ├── app.ts                                # Express app setup, CORS, route mounting, health probes
│   ├── constants.ts                          # RabbitMQ exchanges/queues, URLs, selectors, paths
│   ├── types.ts                              # Shared TypeScript types & definitions
│   │
│   ├── config/
│   │   └── load-env.ts                       # Path-independent environment variable bootstrap
│   │
│   ├── controllers/
│   │   ├── job.controller.ts                 # Job scraping dispatch handler (getAllJobs)
│   │   └── user.controller.ts                # Resume uploads, profile retrieval, profile updates
│   │
│   ├── db/
│   │   └── MongoDb.ts                        # Express MongoDB connection with offline fallback
│   │
│   ├── helper/
│   │   ├── cleanupStaleSnapshots.ts          # Prunes snapshots older than 24h (preserves protected data)
│   │   ├── getAllSnapShots.ts                # Recursively decrypts and collects local snapshots
│   │   ├── SaveSnapShots.ts                  # Deduplicates, encrypts, and persists scraped jobs
│   │   ├── SnapShotsFileNamingConvention.ts  # Generates dateFolder and timestamp file identifiers
│   │   └── userDataHelper.ts                 # Unified file loader/persister for user profile data
│   │
│   ├── middlewares/
│   │   ├── error.middleware.ts               # Standard API error handling & route 404 handler
│   │   ├── job.middleware.ts                 # Resolves candidate resume link & profile context for jobs
│   │   └── resumeUpload.middleware.ts        # Multer validation for PDF & Word documents (max 10MB)
│   │
│   ├── models/Mongo/
│   │   ├── job.models.ts                     # Mongoose Job schema with 24h TTL index & validation
│   │   └── user.models.ts                    # User schema for authentication & resume storage
│   │
│   ├── routes/
│   │   ├── job.routes.ts                     # /api/v1/job routes (equipped with jobMiddleware)
│   │   └── user.routes.ts                    # /api/v1/user routes (resume upload & profile)
│   │
│   ├── Features/
│   │   ├── AI/
│   │   │   └── services/
│   │   │       ├── Cloudincary.ts            # Validates and downloads remote Cloudinary PDF buffers
│   │   │       └── GenAi.ts                  # Google Gemini GenAI candidate resume analyzer
│   │   ├── MessageQueues/
│   │   │   ├── service/
│   │   │   │   ├── consumer/
│   │   │   │   │   ├── DbWorker.ts           # DB persistence consumer executing bulkWrite
│   │   │   │   │   └── ScheduleScrapWorker.ts# Scraper consumer managing browser & HTTP tasks
│   │   │   │   └── producer/
│   │   │   │       └── ScheduleScrape.ts     # Publishes scraping tasks to RabbitMQ
│   │   │   └── utility/manager/
│   │   │       ├── DbWorkerManager.ts        # Supervisor for DB persistence workers (auto-suspended if offline)
│   │   │       └── ScrapWorkerManager.ts     # Supervisor for scraper child processes
│   │   ├── Scrapping/
│   │   │   ├── services/
│   │   │   │   ├── CreatingEnvironmentToScrap.ts # Stealth Playwright browser session interceptor
│   │   │   │   ├── GetDesiredJobs.ts         # Multi-page paginated extraction runner
│   │   │   │   ├── PlatformInitialization.ts # Platform-specific browser context builder
│   │   │   │   └── naukri/
│   │   │   │       ├── HttpBasedScrap.ts     # High-speed HTTP ingestion & offline snapshot fallback
│   │   │   │       └── naukriAuth/Login.ts   # Automated stealth portal authentication
│   │   │   ├── helpers/                      # Pagination runners & recency processors
│   │   │   └── utility/                      # URL builder, HTTP fetcher, rate-limit error handlers
│   │   ├── UserInteractions/
│   │   │   └── utility/
│   │   │       └── basicUserInformation.ts   # Interactive terminal CLI onboarding prompt
│   │   └── Workers/
│   │       └── utility/                      # spawn, readyStatus, shutdown, killAll, connectToDb
│   │
│   └── utility/
│       ├── cloudinary.ts                     # Cloudinary SDK wrapper with custom folder management
│       ├── Logger.ts                         # Winston structured logging utility
│       ├── crypto/                           # AES-256-CBC encryption and decryption routines
│       └── endpointWrapper/                  # ApiError, ApiResponse, and AsyncHandler utilities
│
├── package.json                              # Project metadata, dependencies & Oxlint scripts
└── tsconfig.json                             # TypeScript compiler configuration
```

---

## 🛠️ Technology Stack

| Domain | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Language** | TypeScript | `^7.0.2` | Type safety and modern ECMAScript features |
| **Runtime** | Node.js | `>= 18` (ESM) | Process execution & native `child_process.fork()` |
| **Framework** | Express | `5.2.1` | REST API routing and middleware |
| **Cloud Storage** | Cloudinary | `^2.5.1` | Secure cloud storage for applicant resume files |
| **File Processing** | Multer | `^1.4.5-lts.1` | Multipart form-data parser with filetype & size filtering |
| **Generative AI** | Google GenAI SDK | `^2.28.0` (`@google/genai`) | Gemini AI for candidate resume semantic parsing |
| **Validation** | Zod | `^4.6.5` | Type-safe runtime schema parsing |
| **Message Broker** | RabbitMQ (`amqplib`) | `^2.0.1` | Asynchronous task queues, confirm channels, prefetch |
| **Automation** | Playwright + Playwright Extra | `^1.62.1` | Chromium automation for session cookie/header extraction |
| **Anti-Bot Stealth** | `puppeteer-extra-plugin-stealth` | `^2.11.2` | Bypasses Cloudflare and Naukri bot detection |
| **Database** | MongoDB + Mongoose | `^9.9.5` | Document persistence, unique indices & bulk writes |
| **Execution** | tsx + nodemon | `^4.20.6` / `^3.1.14` | Hot-reloading TypeScript ESM execution |
| **Logging** | Winston | `^3.19.0` | Multi-transport production logging |
| **Linting** | Oxlint | `^1.83.0` | Ultra-fast Rust-based static code analysis |

---

## 🚦 Environment Configuration (`.env`)

Create a `.env` file in the `Backend/` directory:

```env
# Server
PORT=8000
NODE_ENV=development

# Database (Optional - system gracefully enters offline snapshot mode if omitted)
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net
# Note: Database name defaults to "BhaiDekhLe" (defined in constants.ts)

# RabbitMQ (Local or CloudAMQP)
RABBITMQ_URL_WITH_CREDENTIALS="amqps://<username>:<password>@<host>/<vhost>"

# Worker Configuration
SCRAP_WORKER_COUNT=4
DB_WORKER_COUNT=2
WORKER_ID="worker-1"

# Frontend / CORS
FRONTEND_URL=http://localhost:5173

# AI Integration
GEMINI_API_KEY=your_gemini_api_key_here

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

> **Offline / Snapshot Mode:** If `MONGO_URI` is not defined in `.env`, the database connection and `DbWorker` processes are suspended automatically. Scraped jobs are encrypted and stored in `Backend/snapShots/DD-MM-YYYY/`, and stale snapshot folders from prior days are automatically cleaned up while preserving critical user profiles and encrypted client tokens.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: `v18.x` or higher
- **MongoDB**: Local instance or MongoDB Atlas (optional)
- **RabbitMQ**: Local broker or CloudAMQP instance
- **Cloudinary Account**: For candidate resume document uploads

### 2. Install Dependencies & Playwright Browsers

```bash
cd Backend
npm install

# Download Chromium binary for Playwright
npm run playwright:install
```

### 3. Run Development Server

```bash
npm run dev
```

Upon boot, the server prompts for candidate profile details if not yet configured, checks MongoDB connection, and starts worker clusters:

```text
Server is running on 8000
MongoDB connected
worker-1 spawned. PID=24100
worker-2 spawned. PID=24101
worker-3 spawned. PID=24102
worker-4 spawned. PID=24103
worker-1 is ready
worker-2 is ready
worker-3 is ready
worker-4 is ready
All 4 scraper workers are listening.
db-worker-1 spawned. PID=24104
db-worker-2 spawned. PID=24105
db-worker-1 is ready
db-worker-2 is ready
All 2 DB workers are listening.
All workers started.
```

### 4. Trigger Scraping Pipeline

```bash
# Trigger distributed scraping
curl -X GET http://localhost:8000/api/v1/job/getAll

# Check server health
curl -X GET http://localhost:8000/api/v1/test
```

---

## 📡 API Reference

### Jobs API

| Method | Endpoint | Description | Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/job/getAll` | Executes `jobMiddleware` (attaches candidate resume & profile) and publishes scraping tasks | `{ success: true }` |

### User & Resume Profile API

| Method | Endpoint | Description | Response |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/user/upload-resume` | Uploads PDF or Word resume (`multipart/form-data`, field: `resume`, max 10MB) to Cloudinary & syncs to DB/local profile | `{ success: true, resumeUrl, fileName, sizeBytes }` |
| `GET` | `/api/v1/user/profile` | Retrieves candidate profile from DB or local JSON storage (`userDetails.personal.json`) | `{ success: true, source: "database" \| "file", data }` |
| `PUT` | `/api/v1/user/profile` | Updates candidate contact info, target roles, and job search filters | `{ success: true, data }` |

### System Health

| Method | Endpoint | Description | Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/test` | Liveness probe returning server uptime | `{ success: true, status: "ok", uptime: 142.3 }` |

---

## 📋 Database Schemas

### `JobModel`

```typescript
interface JOB_DETAILS extends Document {
  readonly title: string;                  // e.g., "Senior React Developer"
  readonly jobId: string;                  // Unique Naukri job identifier (Unique Index)
  readonly footerPlaceholderLabel: string; // e.g., "1 Day Ago"
  readonly footerPlaceholderColor: string; // e.g., "#00a152"
  readonly companyName: string;            // e.g., "Tech Corp"
  readonly tagsAndSkills: string[];        // e.g., ["React.js", "TypeScript", "Redux"]
  readonly placeholders: Record<string, string>[]; // Experience, Salary, Location
  readonly jdURL: string;                  // Direct URL to job details page
  readonly JD: string;                     // Full job description HTML/text
  readonly createdDate: number;            // Unix timestamp
  readonly salaryDetails: Record<string, unknown>;
  readonly minExp: string;                 // Minimum required experience in years
  readonly maxExp: string;                 // Maximum experience in years
  readonly applyByTime: string;            // Application deadline
  readonly walkIn: boolean;                // Walk-in interview indicator
  readonly createdAt: Date;                // Auto-managed Mongoose timestamp (TTL Index: 24h auto-expiry)
  readonly updatedAt: Date;                // Auto-managed Mongoose timestamp
}
```

> **Automated Data Lifecycle:** Includes a MongoDB TTL (Time-To-Live) index on `createdAt` (`expireAfterSeconds: 86400`) that automatically cleans up job listings 24 hours after persistence.

### `UserModel`

```typescript
interface User extends Document {
  fullname: string;
  email: string;
  password?: string;
  resume?: {
    path: string;       // Cloudinary URL or file path
    fileName?: string;  // Original file name (e.g., resume.pdf)
    uploadedAt?: Date;
  };
  jobPreferences?: {
    keywords: string[];
    locations: string;
    minSalary: number;
    jobTypes: "full-time" | "part-time" | "contract" | "internship" | null;
    employType: "remote" | "on-site" | "hybrid" | null;
  };
}
```

---

## 📜 NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts server with `nodemon` + `tsx` hot-reloading |
| `npm run build` | Compiles TypeScript into JavaScript inside `dist/` |
| `npm start` | Runs compiled production server from `dist/index.js` |
| `npm run playwright:install` | Downloads Chromium browser binary for Playwright |
| `npm run lint` | Runs ultra-fast static code linting via Oxlint |
| `npm run lint:fix` | Automatically fixes code style and lint issues using Oxlint |

---

## 🏷️ Version Changelog

### Version `1.3.0` (Current)
- **Interactive User Profile Onboarding & Setup (`basicUserInformation.ts`):**
  - Integrated interactive CLI onboarding prompt prior to server startup to configure applicant details (full name, email, phone, resume location/link), target job roles, years of experience, work mode, and search keyword preferences.
  - Automatically verifies and persists profile data to `data/personalDetails.personal.json` with secure schema typing and terminal styling.
- **Encrypted Job Snapshots & Offline Resilience (`crypto/` & `snapShots/`):**
  - Implemented AES-256-CBC authenticated encryption (`.encrypted.json`) with cipher initialization vectors (IVs) and auth tags for raw job payloads.
  - Added robust decryption and fallback parsing for offline replay and resilience against Naukri gateway throttling.
- **Naukri Authentication & Session Automation (`Login.ts`):**
  - Added dedicated Playwright stealth login automation for portal authentication.
  - Centralized authentication selectors and credential dispatch flows in `constants.ts`.
- **Optimized Unordered Bulk Ingestion & Duplicate Handling (`DbWorker.ts`):**
  - Refactored `JobModel.bulkWrite()` to execute unordered `insertOne` documents (`ordered: false`).
  - Added smart duplicate key handling (`E11000` / code 11000) that seamlessly logs and skips pre-existing jobs while committing new listings without nacking messages or blocking the pipeline.
- **Job Schema Enhancements & 24-Hour TTL Auto-Expiry (`job.models.ts`):**
  - Added `footerPlaceholderColor` property mapping.
  - Configured 24-hour TTL index (`expireAfterSeconds: 86400`) on `createdAt` for automated database garbage collection.
  - Implemented Mongoose post-save validation hooks with formatted `ApiError` reporting.
- **Unified Winston Structured Logging:**
  - Migrated logging across all worker consumers, worker managers, and scraping services to a unified Winston logger (`Logger.ts`) with structured levels (`info`, `debug`, `error`, `warn`, `success`).
- **Modernized Tooling & Linting:**
  - Integrated Oxlint (`oxlint`, `oxlint --fix`) for lightning-fast Rust-based static linting.
  - Updated dependencies to Node.js type definitions `^26.6.4` and TypeScript `^7.0.2`.

### Version `1.2.0`
- **Decoupled Two-Tier Queue Architecture:** Separated scraper tasks (`TimedScrapping`) from database writes (`db_save`), preventing database latency from stalling browser/HTTP pipelines.
- **Dedicated Worker Managers:** Introduced `ScrapWorkerManager` and `DbWorkerManager` to orchestrate scraper and database child processes independently.
- **Robust Worker Lifecycle Engine:**
  - Standardized `spawnWorker` utility with automatic restart backoff (3s) on abnormal exits (`code !== 0` or kill signals).
  - Implemented IPC readiness handshake (`readyStatus.ts`) with a 30s startup timeout.
  - Spliced dead processes out of active worker collections upon exit.
  - Prevented respawns during intentional shutdowns (`isShuttingDown()` state check).
- **Two-Phase Graceful Teardown:** Coordinated shutdown in `index.ts` that terminates scraper workers first (cutting off new jobs) before shutting down database persistence workers.
- **Publisher Confirms for Scrapers:** `ScheduleScrapWorker` now uses RabbitMQ confirm channels (`waitForConfirms()`) before ACKing the original scrape message.
- **Bulk Database Ingestion:** `DbWorker` executes high-throughput upserts via Mongoose `JobModel.bulkWrite()`.

### Version `1.1.0`
- RabbitMQ worker cluster with Playwright stealth session discovery.
- Mathematical page partitioning via `DistributingWork.ts`.
- Rate limit detection with seamless pagination resumption from `lastPageCrashed`.

### Version `1.0.0`
- Initial Express + MongoDB API.
- Basic Playwright session interception.

---

## 👤 Author

**Sachin Singh Patwal**  
GitHub: [@SachinSinghPatwal](https://github.com/SachinSinghPatwal)

---

## 📄 License

ISC License
