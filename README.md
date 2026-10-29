# BhaiDekhLe — Distributed Naukri Job Scraper, JD Ingestion & AI Resume Evaluation Pipeline

> **Version:** `1.5.0`  
> **Status:** Production-Ready Distributed Micro-Worker Architecture & Automation Pipeline  
> **Runtime:** Node.js (ESM) + TypeScript + Express 5 + RabbitMQ + Playwright Stealth + MongoDB + Google Gemini GenAI

BhaiDekhLe is an enterprise-grade, distributed scraping, ingestion, and AI evaluation pipeline designed to scrape, filter, persist, and semantically score tech job listings from [Naukri.com](https://www.naukri.com) against candidate resumes. It circumvents anti-bot detection (Cloudflare / reCAPTCHA) with stealth browser automation and coordinates workloads through a decoupled, multi-tier RabbitMQ worker architecture with automated crash detection, self-healing respawns, unordered bulk database ingestion, deep-page Job Description (JD) analysis powered by Google Gemini GenAI, and an IPC-synchronized, pinned two-row terminal user interface.

---

## 🚀 Key Highlights

- **Decoupled Multi-Phase Pipeline:**
  1. **Phase 1 (Search Scraping):** Ephemeral Playwright stealth session intercepts search API tokens, dynamically computes total page ranges, and distributes paginated extraction across RabbitMQ workers (`TimedScrapping`).
  2. **Phase 2 (Persistence & Deduplication):** Dedicated database workers consume job batches via RabbitMQ (`db_save`) and execute unordered `bulkWrite()` in MongoDB, bypassing duplicate collisions (`E11000`).
  3. **Phase 3 (Deep JD Scraping & Gemini AI Evaluation):** Automatically triggered post-persistence or on-demand via queue. Navigates to individual job detail pages via stealth Playwright sessions, parses full Job Descriptions (JDs), saves them to disk (`allJdDescriptions.private.json`), and feeds them alongside the candidate resume to Google Gemini GenAI for scoring.
- **Centralized IPC Terminal Coordinator (Pinned 2-Row Display):**
  - **Single Writer Principle:** Only the host process writes directly to `process.stdout`.
  - **Inter-Process Terminal Synchronization:** Forked child workers (`worker-1..4`, `db-worker-1..2`) send log and loader events across Node.js IPC (`TERMINAL_LOG`, `TERMINAL_LOADER`, `TERMINAL_STOP`, `TERMINAL_FAIL`) without console collisions or race conditions.
  - **Strict 2-Row Pinned Display:** Row 1 dynamically updates the **single latest log** in-place; Row 2 renders the active loader or Braille matrix bar. Eliminates terminal scrolling and buffer accumulation.
  - **ANSI-Aware Boundary Engine (`clampVisible`):** Sanitizes escape sequences and truncates output to `process.stdout.columns - 1`, preventing line wraps that break terminal cursor coordinates (`\x1b[1A`).
- **Animated 2D Braille Matrix Bar (`startCustomBrailleBar`):**
  - Continuous 80ms background interval rendering an 8-dot Braille matrix (2 columns × 4 rows per character).
  - Randomized constellation seed algorithm generating organic dot clusters that expand dynamically across runs.
  - Dynamic white-to-orange sinusoidal color wave (`rgb(255, 110-255, 20-255)`).
  - Point-of-failure error indicator with a red dot (`●`) and diagnostic message printed below the bar.
- **Dynamic Real-Time Work Sizing:**
  - Derives total page counts directly from live search interception payloads (`endPage - initialPage + 1`) without artificial page clamping.
  - Accurately tracks large-scale scrape jobs (e.g. `17/941 pages`).
- **AI-Powered Candidate-to-Job Fit Evaluation:**
  - Evaluates candidate resumes against extracted JDs using Google Gemini GenAI (`@google/genai`).
  - Strict runtime schema validation via **Zod** (`JobRatingSchema` & `BatchJobRatingSchema`).
  - Computes `matchScore` (0–100), `fitVerdict` (*Strong Match*, *Moderate Match*, *Low Match*, *Not a Fit*), highlights `matchingSkills` vs. `missingSkills`, and generates tailored recommendations.
  - Renders a formatted visual dashboard report directly in the backend terminal.
- **Resilient Local-First Resume Loader:**
  - **Local First:** Checks `Backend/data/*.pdf` unconditionally before any remote network call.
  - **Remote Soft-Fail:** Cloudinary URL / database profile link acts as a non-blocking fallback that absorbs 401/unauthorized errors without crashing the pipeline.
  - **Graceful Degradation:** Skips AI rating cleanly if no resume is found while allowing scraping and database persistence to succeed uninterrupted.
- **Autonomous Worker Supervision & Windows Heartbeat Watchdog:**
  - Child workers spawned via Node.js `child_process.fork()` with IPC readiness handshakes, exit-code monitoring, 3-second crash backoff, and automatic respawning.
  - 2-second heartbeat parent watchdog (`process.kill(parentPid, 0)`) prevents orphaned child workers from surviving nodemon restarts on Windows.
- **Ordered Two-Phase Graceful Teardown:** Centralized shutdown protocol that drains and terminates scrapers first before stopping database ingestion workers, preventing in-flight data loss.
- **Stealth Browser Session Interception & Auth:** Headless Chromium automated via `playwright-extra` and `puppeteer-extra-plugin-stealth` with automated login support (`Login.ts`) to bypass Cloudflare/Naukri bot protection, capturing authentic session tokens and search headers.
- **Interactive User Profile Onboarding:** Pre-boot interactive terminal CLI (`basicUserInformation.ts`) configuring candidate details, skills, target roles, experience levels, and search filters before workers initialize.
- **Deterministic Load Distribution:** Partitions pagination across active scraper processes using mathematical range splitting (`DistributingWork.ts`).
- **Encrypted Local Snapshot Resilience:** Scraped data caching with AES-256-CBC encryption (`.encrypted.json`) and authenticated decryption for reliable replay and offline tolerance.
- **Atomic Bulk Persistence & Duplicate Handling:** Dedicated database workers consume job batches and execute unordered `insertOne` operations via MongoDB `JobModel.bulkWrite()`, gracefully handling duplicate key collisions (`E11000`) and expiring stale jobs with a 24-hour TTL index.
- **Structured Observability & Fast Tooling:** Centralized Winston structured logging with custom pinned transports, backed by high-speed Rust-based Oxlint static analysis.

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

## 🖥️ Centralized IPC Terminal Coordinator & Pinned UI

To provide clean, professional, non-scrolling CLI progress output across multiple parallel child processes, the application routes all console interactions through a **Single Writer Principle**:

```
+-----------------------------------------------------------------------------------+
|                             Terminal IPC Architecture                             |
+-----------------------------------------------------------------------------------+

   [Child Worker 1..4]                  [DB Worker 1..2]              [Host Index Process]
            |                                  |                                |
            | IPC: TERMINAL_LOG                | IPC: TERMINAL_LOADER           | Direct Logger
            +----------------+                 +----------------+               |
                             |                                  |               |
                             v                                  v               v
                +-------------------------------------------------------------------+
                |            Host Terminal Coordinator (TerminalProgress.ts)        |
                +-------------------------------------------------------------------+
                                                 |
                                  clampVisible(columns - 1)
                                                 |
                                                 v
                +-------------------------------------------------------------------+
                | Row 1: \x1b[1A\r\x1b[2K [Single Latest Application Log]           |
                | Row 2: \r\x1b[2K        [Active Spinner or Braille Dot Bar]       |
                +-------------------------------------------------------------------+
```

### Visual Layout
```text
14:26:56 [info]: [worker-3] Starting scraping work size: 941 pages (from 2 to 942)
[worker-3] naukri  [⠀⠀⠀⠠⠀⠄⠠⠀⠀⠀⠀⠀⠀⠀⠠⠀⠀]  2% (17/941)
```

- **Row 1**: Displays strictly **one** latest log. Overwritten in place on every new log event.
- **Row 2**: Displays the active Braille dot matrix bar or spinner frame.
- **Seamless State Transitions**: When loaders complete (`.stop()`), Row 1 displays the success confirmation (`✔ ...`) while Row 2 clears instantly without advancing the cursor (`\n`), allowing subsequent scrapers to claim Row 2 without terminal scrolling.

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
   - Calculates page ranges dynamically based on total jobs available via `DistributingWork.ts`.
   - Iterates through paginated endpoints using raw HTTP requests (`Fetch.ts`) with anti-bot randomized jitter and periodic breathers (`breather.ts`).
   - Updates the live Braille dot bar across actual page sizes (e.g. `17/941`).
   - Filters extracted jobs by target skills and recency (`<= 3 days`).
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
   - Hooks into `startCustomBrailleBar` across the batch (`1/192`, `2/192`...).
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
5. **Dashboard Rendering:** Prints a visual summary report directly in the server terminal.

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
  jdURL: z.string(),
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

---

## 💀 Worker Supervision & Crash Recovery

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
- Heartbeat watchdog: checks parent PID every 2000ms (`process.kill(parentPid, 0)`), preventing orphaned worker zombies on Windows when nodemon restarts.

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
│   │   │   ├── helpers/                      # Pagination runners, breather & recency processors
│   │   │   └── utility/                      # URL builder, HTTP fetcher, rate-limit error handlers
│   │   │
│   │   ├── UserInteractions/
│   │   │   └── utility/
│   │   │       └── basicUserInformation.ts   # Interactive terminal CLI onboarding prompt
│   │   └── Workers/
│   │       └── utility/                      # spawn, readyStatus, shutdown, killAll, connectToDb
│   │
│   └── utility/
│       ├── TerminalProgress.ts               # Centralized IPC terminal renderer & Braille matrix bar
│       ├── TerminalProgress.mock.ts          # Terminal progress visual test and mock suite
│       ├── Logger.ts                         # Winston structured logging with PinnedConsoleTransport
│       ├── TimeOut.ts                        # Parameterized asynchronous timeout utility
│       ├── cloudinary.ts                     # Cloudinary SDK wrapper with custom folder management
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
| **Terminal UI** | Braille Matrix Engine | Custom | 2D Braille matrix dot bar with organic constellation seeds & wave effects |
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
| **Logging** | Winston | `^3.19.0` | Multi-transport structured logging with pinned console coordinator |
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

## 🏷️ Version Changelog

### Version `1.5.0` (Current)
- **Centralized IPC Terminal Coordinator Architecture (`TerminalProgress.ts`, `spawn.ts`):**
  - Converted terminal output to a Single Writer model via Node.js IPC, preventing child processes from racing on stdout or scrolling the screen.
  - Implemented pinned 2-row layout: Line 1 updates the single latest log in-place; Line 2 renders the active loader/progress bar.
  - Added `clampVisible()` to prevent line-wrapping from breaking terminal ANSI coordinates (`\x1b[1A`).
  - Removed trailing newlines from loader stop states for clean, non-scrolling transitions.
- **Custom 2D Braille Dot Matrix Progress Bar (`startCustomBrailleBar`):**
  - Unicode 8-dot matrix (2x4 per character) with randomized constellation seeds growing organically across runs.
  - Continuous sinusoidal color wave transitioning from white to orange (`rgb(255, 110-255, 20-255)`).
  - Diagnostic error display with red dot (`●`) and contextual reason below the bar on failure.
- **Dynamic Real-Time Work Sizing:**
  - Removed artificial page limits (`Math.min(..., 90)`); calculates true total pages directly from search payloads (`endPage - initialPage + 1`).
- **Batch Playwright JD Scraping & Live Progress (`naukriJDScrap.ts`):**
  - Integrated `startCustomBrailleBar` across the Playwright JD extraction batch, rendering continuous progress alongside in-place navigation logs.
- **Windows Process Orphan / Zombie Watchdog:**
  - Added a 2-second heartbeat parent PID watchdog (`process.kill(parentPid, 0)`) in `ScheduleScrapWorker.ts` and `DbWorker.ts` to eliminate zombie processes during nodemon restarts.
- **Network Resilience Upgrades:**
  - Increased search interception timeouts to 25 seconds in `RaceForResponseOrTimeOut.ts` and `TimeOut.ts`.

### Version `1.4.0`
- **Deep Job Description (JD) Scraping Subsystem (`naukriJDScrap.ts`):**
  - Spawns Playwright stealth browser sessions to navigate directly to each job's `jdURL`.
  - Extracts comprehensive description HTML and text using responsive selector fallbacks.
  - Consolidates and persists structured JSON directly to `Backend/src/Features/Scrapping/data/allJdDescriptions.private.json`.
- **Google Gemini GenAI Resume-to-JD Evaluation:**
  - Evaluates candidate resumes against scraped JDs using Google Gemini GenAI (`@google/genai`).
  - Runtime output validation with **Zod** (`BatchJobRatingSchema`, `JobRatingSchema`).
  - Computes match scores (0–100), categorization verdicts, matching skills, gap skills, and tailored advice.
- **Local-First Resume Loading Strategy:**
  - Hard-prioritizes local candidate resumes from `Backend/data/*.pdf`.
  - Soft-fails on remote Cloudinary URLs when facing 401 or network issues.
- **Automated Ingestion Pipeline Triggering:**
  - Invokes `naukriJDScrap` immediately after `DbWorker` completes bulk writes.
  - Added dedicated producer `ScheduleJdScrape.ts` and API endpoints (`POST` and `GET` `/api/v1/job/scrap-jd`).

### Version `1.3.0`
- **Interactive User Profile Onboarding & Setup (`basicUserInformation.ts`)**
- **Encrypted Job Snapshots & Offline Resilience (`crypto/` & `snapShots/`)**
- **Naukri Authentication & Session Automation (`Login.ts`)**
- **Optimized Unordered Bulk Ingestion & Duplicate Handling (`DbWorker.ts`)**
- **Job Schema Enhancements & 24-Hour TTL Auto-Expiry (`job.models.ts`)**
- **Unified Winston Structured Logging & Oxlint**

### Version `1.2.0`
- Decoupled two-tier queue architecture separating scraper tasks from database writes.
- Dedicated worker managers (`ScrapWorkerManager`, `DbWorkerManager`).
- Coordinated two-phase graceful teardown.

---

## 👤 Author

**Sachin Singh Patwal**  
GitHub: [@SachinSinghPatwal](https://github.com/SachinSinghPatwal)

---

## 📄 License

ISC License
