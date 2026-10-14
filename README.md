# BhaiDekhLe — Distributed Naukri Job Scraper, JD Ingestion & AI Resume Evaluation Pipeline

> **Version:** `1.4.0`  
> **Status:** Production-Ready Distributed Micro-Worker Architecture & Automation Pipeline  
> **Runtime:** Node.js (ESM) + TypeScript + Express 5 + RabbitMQ + Playwright Stealth + MongoDB + Google Gemini GenAI

BhaiDekhLe is an enterprise-grade, distributed scraping, ingestion, and AI evaluation pipeline designed to scrape, filter, persist, and semantically score tech job listings from [Naukri.com](https://www.naukri.com) against candidate resumes. It circumvents anti-bot detection (Cloudflare / reCAPTCHA) with stealth browser automation and coordinates workloads through a decoupled, multi-tier RabbitMQ worker architecture with automated crash detection, self-healing respawns, unordered bulk database ingestion, and deep-page Job Description (JD) analysis powered by Google Gemini GenAI.

---

## 🚀 Key Highlights

- **Decoupled Three-Phase Pipeline:**
  1. **Phase 1 (Search Scraping):** Scrapes, intercepts tokens, partitions pagination, and filters job listings via RabbitMQ (`TimedScrapping`).
  2. **Phase 2 (Persistence & Deduplication):** Dedicated database workers consume job batches via RabbitMQ (`db_save`) and execute unordered `bulkWrite()` in MongoDB, bypassing duplicate collisions (`E11000`).
  3. **Phase 3 (Deep JD Scraping & Gemini AI Evaluation):** Automatically triggered post-persistence or on-demand via queue. Navigates to individual job detail pages via stealth Playwright sessions, parses full Job Descriptions (JDs), saves them to disk (`jobId.json`), and feeds them alongside the candidate resume to Google Gemini GenAI for scoring.
- **AI-Powered Candidate-to-Job Fit Evaluation:**
  - Evaluates candidate resumes against extracted JDs using Google Gemini GenAI (`@google/genai`).
  - Strict runtime schema validation via **Zod** (`JobRatingSchema` & `BatchJobRatingSchema`).
  - Computes `matchScore` (0–100), `fitVerdict` (*Strong Match*, *Moderate Match*, *Low Match*, *Not a Fit*), highlights `matchingSkills` vs. `missingSkills`, and generates tailored recommendations.
  - Renders a formatted visual dashboard report directly in the backend terminal.
- **Resilient Local-First Resume Loader:**
  - **Local First:** Checks `Backend/data/*.pdf` unconditionally before any remote network call.
  - **Remote Soft-Fail:** Cloudinary URL / database profile link acts as a non-blocking fallback that absorbs 401/unauthorized errors without crashing the pipeline.
  - **Graceful Degradation:** Skips AI rating cleanly if no resume is found while allowing scraping and database persistence to succeed uninterrupted.
- **Autonomous Worker Supervision:** Child workers spawned via Node.js `child_process.fork()` with IPC readiness handshakes, exit-code monitoring, 3-second crash backoff, and automatic respawning.
- **Ordered Two-Phase Graceful Teardown:** Centralized shutdown protocol that drains and terminates scrapers first before stopping database ingestion workers, preventing in-flight data loss.
- **Stealth Browser Session Interception & Auth:** Headless Chromium automated via `playwright-extra` and `puppeteer-extra-plugin-stealth` with automated login support (`Login.ts`) to bypass Cloudflare/Naukri bot protection, capturing authentic session tokens and search headers.
- **Interactive User Profile Onboarding:** Pre-boot interactive terminal CLI (`basicUserInformation.ts`) configuring candidate details, skills, target roles, experience levels, and search filters before workers initialize.
- **Deterministic Load Distribution:** Partitions pagination across active scraper processes using mathematical range splitting (`DistributingWork.ts`).
- **Encrypted Local Snapshot Resilience:** Scraped data caching with AES-256-CBC encryption (`.encrypted.json`) and authenticated decryption for reliable replay and offline tolerance.
- **Atomic Bulk Persistence & Duplicate Handling:** Dedicated database workers consume job batches and execute unordered `insertOne` operations via MongoDB `JobModel.bulkWrite()`, gracefully handling duplicate key collisions (`E11000`) and expiring stale jobs with a 24-hour TTL index.
- **Structured Observability & Fast Tooling:** Centralized Winston structured logging across all processes, backed by high-speed Rust-based Oxlint static analysis.

---

## 🏗️ Architecture & Pipeline Flow

```
                                  +-----------------------+
                                  |   HTTP Client / API   |
                                  +-----------+-----------+
                                              |
                   +--------------------------+--------------------------+
                   |                                                     |
          GET /api/v1/job/getAll                              POST /api/v1/job/scrap-jd
                   |                                                     |
                   v                                                     v
       +-----------------------+                             +-----------------------+
       |   job.controller.ts   |                             |   job.controller.ts   |
       |  ScheduleScrapping()  |                             |   ScheduleJdScrape()  |
       +-----------+-----------+                             +-----------+-----------+
                   |                                                     |
                   | (Confirm Channel Publish)                           | (Confirm Channel Publish)
                   v                                                     v
       +-----------------------------------------------------------------------------+
       |                         Exchange: "TimedScrapping"                          | (Direct, Durable)
       +-----------------------------------------------------------------------------+
                                              | Routing Key: "Scrapper"
                                              v
       +-----------------------------------------------------------------------------+
       |                           Queue: "TimedScrapping"                           |
       +-----------------------------------------------------------------------------+
                                       |             |
                        prefetch(1)    |             |    prefetch(1)
                                       v             v
                              +--------+----+   +----+--------+
                              |  Scraper-1  |   |  Scraper-2  | (ScrapWorkerManager.ts)
                              +--------+----+   +----+--------+
                                       |             |
                +----------------------+-------------+-----------------------+
                |                                                            |
                v (Phase 1A: Search Listings Scraping)                       v (Phase 1B: Standalone JD Task)
    +--------------------------------------+                     +-----------------------------------+
    | PlatformInitialization ("naukri")    |                     | PlatformInitialization("naukri-jd")|
    | - Playwright Stealth Session         |                     | - Directly launches               |
    | - Intercepts /jobapi/v3/search       |                     |   naukriJDScrap()                 |
    | - Partitioned Pagination (HTTP)      |                     +-----------------+-----------------+
    | - Filter: Recency <= 3d & Skills     |                                       |
    +------------------+-------------------+                                       |
                       |                                                           |
                       v (Confirm Channel Publish)                                 |
    +--------------------------------------+                                       |
    |     Exchange: "db_save_exchange"     | (Direct, Durable)                     |
    +------------------+-------------------+                                       |
                       | Routing Key: "Save"                                       |
                       v                                                           |
    +--------------------------------------+                                       |
    |           Queue: "db_save"           |                                       |
    +------------------+-------------------+                                       |
             |                 |                                                   |
 prefetch(1) |                 | prefetch(1)                                       |
             v                 v                                                   |
    +--------+----+   +--------+----+                                              |
    | DB-Worker-1 |   | DB-Worker-2 | (DbWorkerManager.ts)                         |
    +--------+----+   +--------+----+                                              |
             |                 |                                                   |
             +--------+--------+                                                   |
                      | (Phase 2: Bulk Ingestion)                                  |
                      v                                                            |
    +--------------------------------------+                                       |
    | MongoDB (JobModel.bulkWrite)         |                                       |
    | - Operation: insertOne (unordered)   |                                       |
    | - Deduplication: E11000 bypass       |                                       |
    | - TTL auto-cleanup: 24h index        |                                       |
    +------------------+-------------------+                                       |
                       |                                                           |
                       v (Phase 3: Immediate JD Scraping & AI Rating)              |
    +------------------------------------------------------------------------------+
    |                         naukriJDScrap(jobs, workerId)                        |
    +------------------------------------------------------------------------------+
                                       |
        +------------------------------+------------------------------+
        |                                                             |
        v                                                             v
+-----------------------------------+             +-----------------------------------+
| 1. Playwright JD Scraping         |             | 2. Candidate Resume Loading       |
| - createScrapingSession()         |             | - 1st: Backend/data/*.pdf (LOCAL) |
| - Navigates to each job.jdURL     |             | - 2nd: Cloudinary URL (soft-fail) |
| - Resilient container selectors   |             | - 3rd: personalDetails.json       |
| - Saves consolidated batch to     |             | - Fallback: Graceful null return  |
|   allJdDescriptions.private.json  |             +-----------------+-----------------+
+-----------------+-----------------+                               |
                  |                                                 |
                  +-----------------------+-------------------------+
                                          |
                                          v (Phase 4: Gemini AI Semantic Evaluation)
                      +---------------------------------------+
                      | Google Gemini GenAI (@google/genai)   |
                      | - System prompt with candidate resume |
                      | - Structured JSON output (Zod schema) |
                      | - Match score (0-100) & fit verdicts  |
                      | - Matching & gap skills breakdown     |
                      +-------------------+-------------------+
                                          |
                                          v
                      +---------------------------------------+
                      | Visual Terminal Dashboard & Summary   |
                      +---------------------------------------+
```

---

## 🔄 Multi-Tier Queue & Worker Architecture (`Queue + Worker + Work`)

The system decouples scraping, database persistence, and deep AI evaluation across dedicated tiers to guarantee non-blocking execution, backpressure isolation, and fault tolerance:

### Tier Overview

| Component | Tier 1: Scraper Queue | Tier 2: Database Persistence Queue | Stage 3: JD Scraping & AI Evaluation |
| :--- | :--- | :--- | :--- |
| **Exchange** | `TimedScrapping` (Direct, Durable) | `db_save_exchange` (Direct, Durable) | Invoked post-DB save or via `TimedScrapping` |
| **Queue Name** | `TimedScrapping` | `db_save` | N/A (Direct or task routing) |
| **Routing Key** | `Scrapper` | `Save` | `Scrapper` (when enqueued) |
| **Producer** | `ScheduleScrape.ts` / `ScheduleJdScrape.ts` | `ScheduleScrapWorker.ts` | `DbWorker.ts` / `ScheduleJdScrape.ts` |
| **Consumer** | `ScheduleScrapWorker.ts` (Scraper Child) | `DbWorker.ts` (DB Child Process) | `naukriJDScrap.ts` (Worker runtime) |
| **Supervising Manager** | `ScrapWorkerManager.ts` | `DbWorkerManager.ts` | Supervised within worker process pool |
| **Concurrency** | `SCRAP_WORKER_COUNT` (default: `4`) | `DB_WORKER_COUNT` (default: `2`) | Runs in context of active worker |
| **Channel QoS** | `channel.prefetch(1)` | `channel.prefetch(1)` | Isolated Playwright stealth instance |
| **Payload Structure** | `{ platform: "naukri" \| "naukri-jd", totalNumberOfJobs }` | `{ jobs: JOB_DETAILS[] }` | `jobs: JOB_DETAILS[]` + Resume PDF Buffer |
| **Acknowledgment** | ACKs after DB queue confirms receipt | ACKs after `bulkWrite()` resolves | Self-contained completion & logging |

---

### Work Breakdown Across Tiers

#### 1. Search Scraping Tier (`ScheduleScrapWorker.ts`)
1. Receives a scraping trigger message from the `TimedScrapping` queue.
2. If `platform === "naukri"`:
   - Spawns an ephemeral stealth Playwright Chromium instance via `CreatingEnvironmentToScrap.ts`.
   - Intercepts the Naukri search API call to extract the request endpoint, dynamic auth cookies, and headers.
   - Calculates page ranges via `DistributingWork.ts` based on its assigned `workerId`.
   - Iterates through paginated endpoints using raw HTTP requests (`Fetch.ts`) with anti-bot randomized jitter.
   - Filters extracted jobs by target skills (e.g. React, JavaScript) and recency (`<= 3 days`).
   - Publishes `{ jobs: scrapedJobs }` to `db_save_exchange` (routing key `Save`).
3. If `platform === "naukri-jd"`:
   - Dispatches directly to `naukriJDScrap()` and ACKs the message upon completion.

#### 2. Database Persistence Tier (`DbWorker.ts`)
1. Runs as an independent child process with its own isolated connection to MongoDB (`connectToDb.ts`) and RabbitMQ. Suspended automatically if `MONGO_URI` is omitted.
2. Consumes batches from the `db_save` queue with `prefetch(1)`.
3. Executes high-performance unordered batch insertions using Mongoose:
   ```typescript
   await JobModel.bulkWrite(
     jobs.map((job) => ({
       insertOne: {
         document: job,
       },
     })),
     { ordered: false },
   );
   ```
4. Gracefully absorbs duplicate key collisions (`E11000`), allowing new jobs to persist while skipping existing records without failing.
5. Acknowledges the message (`channel.ack(message)`).
6. **Immediate Handoff:** Instantly executes `naukriJDScrap(jobs, workerId)` on the processed batch to begin JD scraping and AI evaluation.

#### 3. Deep JD Scraping & Gemini AI Evaluation (`naukriJDScrap.ts`)
1. **Target Identification:** Resolves jobs from the incoming batch, MongoDB, or decrypted snapshots fallback (`getAllSnapshotJobs`).
2. **Playwright JD Scraping:**
   - Launches a stealth Playwright Chromium browser session via `createScrapingSession()`.
   - Visits each job's `jdURL` with randomized delay and interaction readiness checks (`waitForPageReady`).
   - Queries resilient DOM selectors (`.styles_JDC__dang-inner-html`, `section.job-desc-container`, etc.) with body-text fallback.
   - Consolidates all scraped descriptions into `Backend/src/Features/Scrapping/data/allJdDescriptions.private.json`.
3. **Candidate Resume Resolution:**
   - **Priority 1 (Local):** Scans `Backend/data/` for any `*.pdf` file. If found, reads it into a buffer immediately.
   - **Priority 2 (Remote / Cloudinary):** If no local file exists, attempts fetching the candidate's Cloudinary resume. Soft-fails with a warning on 401 or network issues.
   - **Priority 3 (Config):** Reads resume link from `data/personalDetails.personal.json` or `data/userDetails.personal.json`.
   - If no resume is available, logs a helpful warning and skips AI rating without crashing the DB worker.
4. **Gemini GenAI Evaluation:**
   - Ingests the candidate resume PDF buffer as inline data (`application/pdf`) and passes the scraped JDs.
   - Requests structured JSON validated against `BatchJobRatingSchema` using `@google/genai`.
   - Returns per-job fit scores (0–100), verdict categories, skill matches, skill gaps, and strategic advice.
5. **Dashboard Rendering:** Prints a visual ASCII dashboard report directly in the server terminal.

---

## 🤖 Deep JD Scraping & AI Resume Evaluation Subsystem

### Resume Resolution Hierarchy

```
+-----------------------------------------------------------------------------------+
|                        Candidate Resume Loading Hierarchy                         |
+-----------------------------------------------------------------------------------+

     [loadResumeBuffer()]
             |
             v
     [Check Backend/data/*.pdf] ────── (File exists?) ──────> [Load Local PDF Buffer] ✅
             | No                                                    (Priority 1)
             v
     [Check MongoDB / Profile URL] ─── (Valid URL?)
             |                                |
             |                                v
             |                   [fetchCloudinaryPdf() / fetch()]
             |                                |
             |                      (200 OK?) ─── Yes ──────> [Load Remote Buffer]    ✅
             |                                |                      (Priority 2)
             |                                v (401 / Network Error)
             |                   [Log warning & soft-fail]
             v                                |
     [Check personalDetails.json] <───────────+
             |
             v
      (Path/URL valid?) ───────────── Yes ──────────────────> [Load Config Buffer]    ✅
             | No                                                    (Priority 3)
             v
     [Return null & warn: "Drop PDF into Backend/data/"] ────> [Skip AI Rating Gracefully] ⚠️
```

### Zod AI Evaluation Schema

```typescript
export const JobRatingSchema = z.object({
  jobId: z.string(),
  title: z.string(),
  companyName: z.string(),
  matchScore: z.number().min(0).max(100),
  fitVerdict: z.enum([
    "Strong Match",
    "Moderate Match",
    "Low Match",
    "Not a Fit",
  ]),
  matchingSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  summary: z.string(),
  recommendation: z.string(),
});

export const BatchJobRatingSchema = z.object({
  overallSummary: z.string(),
  ratedJobs: z.array(JobRatingSchema),
});
```

### Terminal Rating Report Preview

```text
=====================================================================================
🎯  GEMINI AI RESUME vs NAUKRI JOB DESCRIPTIONS RATING REPORT
=====================================================================================
📄 Candidate Resume Source: local_file:Backend/data/my-resume.pdf
📊 Total Opportunities Evaluated: 25
💡 Profile Summary: Strong full-stack profile with deep React, Node.js, and TypeScript skills.
-------------------------------------------------------------------------------------

[#1] Senior Frontend Developer | Tech Corp (Job ID: 141026001234)
    🟢 Match Score: 88/100 [Strong Match]
    ✅ Matching Skills: React.js, TypeScript, Redux Toolkit, Tailwind CSS, REST APIs
    ⚠️  Missing / Gap Skills: Next.js App Router, GraphQL
    📝 Analysis: Candidate aligns closely with senior frontend engineering expectations.
    💡 Advice: Highlight production state management and component optimization in interview.

[#2] Full Stack Engineer | Cloud Solutions (Job ID: 141026005678)
    🟡 Match Score: 68/100 [Moderate Match]
    ✅ Matching Skills: Node.js, Express, MongoDB, TypeScript
    ⚠️  Missing / Gap Skills: Kubernetes, AWS Lambda, Microservices
    📝 Analysis: Backend competencies match, but DevOps requirements require upskilling.
    💡 Advice: Emphasize containerization experience and willingness to learn AWS primitives.

=====================================================================================
```

---

## 💀 Worker Death, Crash Detection & Respawn Supervision

Child workers operate under supervisor control (`ScrapWorkerManager.ts` & `DbWorkerManager.ts`). The supervisor isolates crashes, monitors OS process events, and executes automatic self-healing respawns without impacting the parent API server or other workers.

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

### Process Spawning & Readiness
- Spawned using Node.js `child_process.fork()` with ESM flags (`--import tsx`) and dedicated `WORKER_ID`.
- Handshake via IPC: `process.send({ type: "ready" })`.
- Startup timeout: `WORKER_READY_TIMEOUT = 30_000` (30 seconds).
- Exit monitoring: abnormal exit (`code !== 0`) triggers delayed respawn after 3 seconds.

---

## 🛑 Coordinated Two-Phase Graceful Shutdown

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

---

## 📂 Repository Structure

```
Backend/
├── data/                                     # Local candidate profile & resume store (gitignored)
│   ├── my-resume.pdf                         # Optional: Local candidate resume (Priority 1 for AI rating)
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
│   │   ├── job.controller.ts                 # Job scraping & JD evaluation handlers (getAllJobs, triggerJdScrape)
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
│   │   ├── job.routes.ts                     # /api/v1/job routes (getAll, scrap-jd)
│   │   └── user.routes.ts                    # /api/v1/user routes (resume upload & profile)
│   │
│   ├── Features/
│   │   ├── AI/
│   │   │   └── services/
│   │   │       ├── Cloudincary.ts            # Validates and downloads remote Cloudinary PDF buffers
│   │   │       └── GenAi.ts                  # Google Gemini GenAI candidate resume semantic analyzer
│   │   │
│   │   ├── MessageQueues/
│   │   │   ├── service/
│   │   │   │   ├── consumer/
│   │   │   │   │   ├── DbWorker.ts           # DB persistence consumer executing bulkWrite & JD trigger
│   │   │   │   │   └── ScheduleScrapWorker.ts# Scraper consumer managing browser & HTTP tasks
│   │   │   │   └── producer/
│   │   │   │       ├── ScheduleScrape.ts     # Publishes search scraping tasks to RabbitMQ
│   │   │   │       └── ScheduleJdScrape.ts   # Enqueues dedicated JD scraping & AI evaluation task
│   │   │   └── utility/manager/
│   │   │       ├── DbWorkerManager.ts        # Supervisor for DB persistence workers
│   │   │       └── ScrapWorkerManager.ts     # Supervisor for scraper child processes
│   │   │
│   │   ├── Scrapping/
│   │   │   ├── data/                         # Persisted Job Descriptions (gitignored)
│   │   │   │   └── allJdDescriptions.private.json    # Consolidated batch of scraped JDs
│   │   │   ├── services/
│   │   │   │   ├── CreatingEnvironmentToScrap.ts # Stealth Playwright browser session interceptor
│   │   │   │   ├── GetDesiredJobs.ts         # Multi-page paginated extraction runner
│   │   │   │   ├── PlatformInitialization.ts # Multi-platform dispatcher (naukri, naukri-jd)
│   │   │   │   └── naukri/
│   │   │   │       ├── HttpBasedScrap.ts     # High-speed HTTP ingestion & offline snapshot fallback
│   │   │   │       ├── naukriJDScrap.ts      # Stealth JD page scraper, resume loader & Gemini evaluator
│   │   │   │       └── naukriAuth/Login.ts   # Automated stealth portal authentication
│   │   │   ├── helpers/                      # Pagination runners & recency processors
│   │   │   └── utility/                      # URL builder, HTTP fetcher, rate-limit error handlers
│   │   │
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
| **Generative AI** | Google GenAI SDK | `^2.28.0` (`@google/genai`) | Gemini AI for candidate resume semantic scoring against JDs |
| **Validation** | Zod | `^4.6.5` | Type-safe runtime schema parsing for AI outputs |
| **Cloud Storage** | Cloudinary | `^2.11.0` | Cloud storage for applicant resume files |
| **File Processing** | Multer | `^2.4.0` | Multipart form-data parser with filetype & size filtering |
| **PDF Extraction** | pdf-parse | `^1.1.1` | Local PDF buffer text parsing |
| **Message Broker** | RabbitMQ (`amqplib`) | `^2.0.1` | Asynchronous task queues, confirm channels, prefetch |
| **Automation** | Playwright + Playwright Extra | `^1.62.1` | Chromium automation for stealth search & JD extraction |
| **Anti-Bot Stealth** | `puppeteer-extra-plugin-stealth` | `^2.11.2` | Bypasses Cloudflare and Naukri bot detection |
| **Database** | MongoDB + Mongoose | `^9.9.5` | Document persistence, unique indices & bulk writes |
| **Execution** | tsx + nodemon | `^4.20.6` / `^3.1.14` | Hot-reloading TypeScript ESM execution |
| **Logging** | Winston | `^3.19.0` | Multi-transport structured production logging |
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

# Google Gemini AI Integration (Required for JD Resume Scoring)
GEMINI_API_KEY=your_gemini_api_key_here

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

> **Local Resume Tip:** To test AI resume rating without configuring Cloudinary, simply drop any PDF resume file directly into `Backend/data/` (e.g. `Backend/data/resume.pdf`). The system will detect it automatically.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: `v18.x` or higher
- **MongoDB**: Local instance or MongoDB Atlas (optional)
- **RabbitMQ**: Local broker or CloudAMQP instance
- **Google Gemini API Key**: For AI resume-to-JD evaluation

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

### 4. Trigger Scraping & Evaluation

```bash
# 1. Trigger Full Search Scraping -> Persistence -> Automatic JD Scraping & AI Rating
curl -X GET http://localhost:8000/api/v1/job/getAll

# 2. Trigger Standalone JD Scraping & AI Rating on existing jobs
curl -X POST http://localhost:8000/api/v1/job/scrap-jd

# 3. Check server health
curl -X GET http://localhost:8000/api/v1/test
```

---

## 📡 API Reference

### Jobs API

| Method | Endpoint | Description | Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/job/getAll` | Executes `jobMiddleware`, attaches user profile context, and publishes search scraping tasks to RabbitMQ. Post-persistence automatically triggers JD scraping and AI evaluation. | `{ success: true, statusCode: 202, message: "Job scraping scheduled successfully" }` |
| `POST` / `GET` | `/api/v1/job/scrap-jd` | Directly enqueues a dedicated JD scraping and Gemini AI resume evaluation task to RabbitMQ (`TimedScrapping` queue with `platform: "naukri-jd"`). | `{ success: true, statusCode: 202, message: "Job Description scraping and AI rating scheduled to messaging queue successfully" }` |

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

### Version `1.4.0` (Current)
- **Deep Job Description (JD) Scraping Subsystem (`naukriJDScrap.ts`):**
  - Spawns Playwright stealth browser sessions to navigate directly to each job's `jdURL`.
  - Extracts comprehensive description HTML and text using responsive selector fallbacks (`.styles_JDC__dang-inner-html`, `section.job-desc-container`, `article`, etc.).
  - Consolidates and persists structured JSON directly to `Backend/src/Features/Scrapping/data/allJdDescriptions.private.json`.
- **Google Gemini GenAI Resume-to-JD Evaluation:**
  - Evaluates candidate resumes against scraped JDs using Google Gemini GenAI (`@google/genai`).
  - Runtime output validation with **Zod** (`BatchJobRatingSchema`, `JobRatingSchema`).
  - Computes match scores (0–100), categorization verdicts (*Strong Match*, *Moderate Match*, *Low Match*, *Not a Fit*), matching skills, gap skills, and tailored advice.
  - Generates an ASCII visual dashboard report in the terminal.
- **Local-First Resume Loading Strategy:**
  - Hard-prioritizes local candidate resumes from `Backend/data/*.pdf`.
  - Soft-fails on remote Cloudinary URLs when facing 401 or network authentication issues without crashing the worker pipeline.
  - Gracefully skips AI rating with a descriptive warning when no resume is present.
- **Automated Ingestion Pipeline Triggering:**
  - Seamlessly invokes `naukriJDScrap` immediately after `DbWorker` completes bulk writes or duplicate key skips.
  - Added dedicated producer `ScheduleJdScrape.ts` and API endpoints (`POST` and `GET` `/api/v1/job/scrap-jd`) for on-demand JD scraping and evaluation.
- **Platform Initialization Router (`PlatformInitialization.ts`):**
  - Added multi-platform dispatching for `naukri-jd` and `jdScrap` tasks via RabbitMQ.

### Version `1.3.0`
- **Interactive User Profile Onboarding & Setup (`basicUserInformation.ts`):**
  - Integrated interactive CLI onboarding prompt prior to server startup to configure applicant details, target job roles, years of experience, and keywords.
  - Automatically verifies and persists profile data to `data/personalDetails.personal.json`.
- **Encrypted Job Snapshots & Offline Resilience (`crypto/` & `snapShots/`):**
  - Implemented AES-256-CBC authenticated encryption (`.encrypted.json`) with IVs and auth tags.
  - Added robust decryption and fallback parsing for offline replay.
- **Naukri Authentication & Session Automation (`Login.ts`):**
  - Added dedicated Playwright stealth login automation for portal authentication.
- **Optimized Unordered Bulk Ingestion & Duplicate Handling (`DbWorker.ts`):**
  - Refactored `JobModel.bulkWrite()` to execute unordered `insertOne` documents (`ordered: false`).
  - Added duplicate key handling (`E11000` / code 11000) that skips pre-existing jobs without nacking.
- **Job Schema Enhancements & 24-Hour TTL Auto-Expiry (`job.models.ts`):**
  - Configured 24-hour TTL index (`expireAfterSeconds: 86400`) on `createdAt`.
- **Unified Winston Structured Logging & Oxlint:**
  - Migrated logging across all worker consumers and managers to Winston (`Logger.ts`).
  - Integrated Oxlint for Rust-based static linting.

### Version `1.2.0`
- **Decoupled Two-Tier Queue Architecture:** Separated scraper tasks (`TimedScrapping`) from database writes (`db_save`).
- **Dedicated Worker Managers:** Introduced `ScrapWorkerManager` and `DbWorkerManager`.
- **Worker Lifecycle Engine:** Standardized `spawnWorker` utility with automatic restart backoff (3s) and IPC readiness handshakes.
- **Two-Phase Graceful Teardown:** Coordinated shutdown terminating scrapers before database persistence workers.
- **Publisher Confirms for Scrapers:** `ScheduleScrapWorker` uses RabbitMQ confirm channels before ACKing.

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
