# BhaiDekhLe — Distributed Naukri Job Scraper & Ingestion Pipeline

> **Version:** `1.2.0`  
> **Status:** Production-Ready Distributed Micro-Worker Architecture  
> **Runtime:** Node.js (ESM) + TypeScript + Express 5 + RabbitMQ + Playwright Stealth + MongoDB

BhaiDekhLe is an enterprise-grade, distributed scraping and ingestion pipeline designed to scrape, filter, and persist tech job listings from [Naukri.com](https://www.naukri.com) at scale. It circumvents bot detection (Cloudflare / reCAPTCHA) with stealth browser automation and coordinates workloads through a decoupled, multi-tier RabbitMQ worker architecture with automated crash detection, self-healing respawns, and graceful teardowns.

---

## 🚀 Key Highlights

- **Decoupled Two-Tier Queue Pipeline:** Separates CPU/network-intensive scraping from I/O-bound database persistence via dedicated RabbitMQ queues (`TimedScrapping` and `db_save`).
- **Autonomous Worker Supervision:** Child workers spawned via Node.js `child_process.fork()` with IPC readiness handshakes, exit-code monitoring, 3-second crash backoff, and automatic respawning.
- **Ordered Two-Phase Graceful Teardown:** Centralized shutdown protocol that drains and terminates scrapers first before stopping database ingestion workers, preventing data loss.
- **Stealth Browser Session Interception:** Headless Chromium automated via `playwright-extra` and `puppeteer-extra-plugin-stealth` to bypass Cloudflare/Naukri bot protection, capturing authentic session tokens and search headers.
- **Deterministic Load Distribution:** Partitions pagination across active scraper processes using mathematical range splitting (`DistributingWork.ts`).
- **Lightweight Paginated HTTP Ingestion:** After single-shot browser session extraction, workers switch to high-speed HTTP fetching, sanitizing HTTP/2 pseudo-headers and streaming 20 jobs per page.
- **Atomic Bulk Persistence:** Dedicated database workers consume job batches and execute upserts via MongoDB `JobModel.bulkWrite()` with indexed `jobId` deduplication.

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
                                                                                    | (Phase 4: Bulk Upsert)
                                                                                    v
                                                                  +-----------------------------------+
                                                                  | MongoDB (JobModel.bulkWrite)      |
                                                                  | - Filter: { jobId }               |
                                                                  | - Update: { $set: job }           |
                                                                  | - Upsert: true                    |
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
  8. **The Handoff:** Publishes the filtered job batch `{ jobs: scrapedJobs }` to `db_save_exchange` with routing key `Save` and `persistent: true`.
  9. Awaits RabbitMQ confirmation via `channel.waitForConfirms()`. Once confirmed, acknowledges the original scrape task via `channel.ack(message)`.

#### 2. Database Persistence Tier (`DbWorker.ts`)
- **Work Performed:**
  1. Runs as an independent child process with its own isolated connection to MongoDB (`connectToDb.ts`) and RabbitMQ.
  2. Consumes batches from the `db_save` queue with `prefetch(1)`.
  3. Parses the incoming payload `{ jobs: [...] }`.
  4. Executes atomic batch operations using Mongoose:
     ```typescript
     await JobModel.bulkWrite(
       jobs.map((job) => ({
         updateOne: {
           filter: { jobId: job.jobId },
           update: { $set: job },
           upsert: true,
         },
       }))
     );
     ```
  5. Acknowledges the message (`channel.ack(message)`) only after the bulk write operation resolves.
  6. On failure, nacks the message (`channel.nack(message, false, true)`) to trigger retry handling without crashing the scraper pool.

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
├── src/
│   ├── index.ts                              # Server entry point, DB connection & worker orchestration
│   ├── app.ts                                # Express setup (CORS, middlewares, routes, health check)
│   ├── constants.ts                          # Exchanges, queue names, Mongo DB names, search queries
│   ├── types.ts                              # Shared TypeScript types & interfaces
│   │
│   ├── config/
│   │   ├── load-env.ts                       # Path-independent dotenv configuration
│   │   ├── naukri-answers.json               # Form auto-fill templates
│   │   └── naukri-selectors.json             # DOM selector dictionary
│   │
│   ├── controllers/
│   │   └── job.controller.ts                 # Route handlers (getAllJobs, createJob)
│   │
│   ├── db/
│   │   └── MongoDb.ts                        # Master Express Mongoose connection
│   │
│   ├── helpers/
│   │   ├── ScrappingPaginatedJob.ts          # Single-page execution & error translation
│   │   ├── Playwright/
│   │   │   ├── interceptingBrowsersHttpCommunication.ts  # Network interception handler
│   │   │   ├── sanitizeCaptureHeaderUrl.ts   # Strips HTTP/2 pseudo-headers (:path, :authority)
│   │   │   └── setIterativePaginationParams.ts # URL searchParams mutator
│   │   └── RMQ/
│   │       └── DistributingWork.ts           # Page partitioner dividing slices across workers
│   │
│   ├── middlewares/
│   │   └── error.middleware.ts               # Global error handler & 404 middleware
│   │
│   ├── models/
│   │   └── Mongo/
│   │       ├── job.models.ts                 # Mongoose Job schema & TypeScript types
│   │       └── user.models.ts                # User schema for auth & resume storage
│   │
│   ├── routes/
│   │   └── job.routes.ts                     # /api/v1/job route definitions
│   │
│   ├── services/
│   │   ├── Scrapper.ts                       # Scraper orchestrator with block recovery loop
│   │   ├── GetDesiredJobs.ts                 # Pagination runner across assigned page slices
│   │   ├── Playwright/
│   │   │   └── CreatingEnviromentToScrap.ts  # Stealth Playwright launcher & session extractor
│   │   └── RMQ/
│   │       ├── ScrapWorkerManager.ts         # Supervisor for scraper child processes
│   │       ├── DbWorkerManager.ts            # Supervisor for DB persistence child processes
│   │       ├── Producer/
│   │       │   └── ScheduleScrape.ts         # RabbitMQ producer dispatching scraping tasks
│   │       └── consumer/
│   │           ├── ScheduleScrapWorker.ts    # Consumer: Scrapes & publishes to DB queue
│   │           └── DbWorker.ts               # Consumer: Reads from DB queue & executes bulkWrite
│   │
│   └── utility/
│       ├── ApiError.ts                       # Standard operational API error class
│       ├── ApiResponse.ts                    # Consistent API response wrapper
│       ├── AsyncHandler.ts                   # Async controller error forwarding wrapper
│       ├── AsyncHandlerContentWrapper.ts     # Try/catch helper utility
│       ├── EndpointRequestBodyValidation.ts  # Validation helper
│       ├── Fetch.ts                          # HTTP fetch utility (detects 429, 406 Recaptcha)
│       ├── Logger.ts                         # Winston multi-transport logger
│       ├── RateLimitingError.ts              # Custom error tracking lastPageCrashed
│       ├── ValidatingProp.ts                 # Recency filter (<= 3 days)
│       ├── sortingJobBasedOnCreated.ts       # Title keyword filter & sorting utility
│       └── workers/
│           ├── connectToDb.ts                # Isolated Mongoose connection for child processes
│           ├── killAll.ts                    # Process cleanup utility
│           ├── readyStatus.ts                # IPC readiness handshake with timeout
│           ├── shutdown.ts                   # SIGTERM broadcast with SIGKILL fallback
│           └── spawn.ts                      # Process spawner, exit handler & crash respawner
│
├── logs/                                     # Winston logs (error.log, combined.log, playwright.log)
├── package.json                              # Project metadata, scripts & dependencies
├── tsconfig.json                             # TypeScript compiler configuration
└── playwright.config.ts                      # Playwright test configuration
```

---

## 🛠️ Technology Stack

| Domain | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Language** | TypeScript | `^5.0.0` / `7.0.2` | Type safety and modern ECMAScript features |
| **Runtime** | Node.js | `>= 18` (ESM) | Process execution & native `child_process.fork()` |
| **Framework** | Express | `5.2.1` | REST API routing and middleware |
| **Message Broker** | RabbitMQ (`amqplib`) | `^2.0.1` | Asynchronous task queues, confirm channels, prefetch |
| **Automation** | Playwright + Playwright Extra | `^1.62.1` | Chromium automation for session cookie/header extraction |
| **Anti-Bot Stealth** | `puppeteer-extra-plugin-stealth` | `^2.11.2` | Bypasses Cloudflare and Naukri bot detection |
| **Database** | MongoDB + Mongoose | `^9.9.5` | Document persistence, unique indices & bulk writes |
| **Execution** | tsx + nodemon | `^4.20.6` / `^3.1.14` | Hot-reloading TypeScript ESM execution |
| **Logging** | Winston | `^3.19.0` | Multi-transport production logging |

---

## 🚦 Environment Configuration (`.env`)

Create a `.env` file in the `Backend/` directory:

```env
# Server
PORT=8000
NODE_ENV=development

# Database
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

# AI Integration (Optional)
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: `v18.x` or higher
- **MongoDB**: Local instance or MongoDB Atlas
- **RabbitMQ**: Local broker or CloudAMQP instance

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

Upon boot, the master server connects to MongoDB and initializes both worker clusters sequentially:

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
| `GET` | `/api/v1/job/getAll` | Publishes scraping tasks to `TimedScrapping` queue | `{ success: true }` |

### System Health

| Method | Endpoint | Description | Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/test` | Liveness probe returning server uptime | `{ success: true, status: "ok", uptime: 142.3 }` |

---

## 📋 Database Schema (`JobModel`)

```typescript
interface JOB_DETAILS {
  title: string;                  // e.g., "Senior React Developer"
  jobId: string;                  // Unique Naukri job identifier (Unique Index)
  footerPlaceholderLabel: string; // e.g., "1 Day Ago"
  companyName: string;            // e.g., "Tech Corp"
  tagsAndSkills: string[];        // e.g., ["React.js", "TypeScript", "Redux"]
  placeholders: Record<string, string>[]; // Experience, Salary, Location
  jdURL: string;                  // Direct URL to job details page
  JD: string;                     // Full job description HTML/text
  createdDate: number;            // Unix timestamp
  salaryDetails: Record<string, unknown>;
  minExp: string;                 // Minimum required experience in years
  maxExp: string;                 // Maximum experience in years
  applyByTime: string;            // Application deadline
  walkIn: boolean;                // Walk-in interview indicator
  createdAt: Date;                // Auto-managed Mongoose timestamp
  updatedAt: Date;                // Auto-managed Mongoose timestamp
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

---

## 🏷️ Version Changelog

### Version `1.2.0` (Current)
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
