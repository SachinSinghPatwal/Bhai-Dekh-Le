import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MatchedJob } from "../types/candidate";
import { getApiUrl } from "../lib/api";

export const APPLIED_BATCH_SIZE = 5;

interface FlushOptions {
  keepalive?: boolean;
}

interface JobStoreState {
  jobs: MatchedJob[];
  pendingApplied: Record<string, boolean>;
  isLoading: boolean;
  isSyncing: boolean;
  lastError: string | null;
  lastSyncedAt: string | null;
  fetchMatchedJobs: () => Promise<void>;
  toggleApplied: (jobId: string) => void;
  setApplied: (jobId: string, applied: boolean) => void;
  flushPendingApplied: (options?: FlushOptions) => Promise<boolean>;
}

let activeFlushPromise: Promise<boolean> | null = null;

export const useJobStore = create<JobStoreState>()(
  persist(
    (set, get) => ({
      jobs: [],
      pendingApplied: {},
      isLoading: false,
      isSyncing: false,
      lastError: null,
      lastSyncedAt: null,

      fetchMatchedJobs: async () => {
        set({ isLoading: true, lastError: null });
        try {
          const res = await fetch(`${getApiUrl()}/api/v1/job/matched`);
          if (!res.ok) {
            throw new Error(`Failed to fetch matched jobs (${res.status})`);
          }
          const json = await res.json();
          const serverJobs: MatchedJob[] = Array.isArray(json?.data?.jobs)
            ? json.data.jobs
            : [];

          const pending = get().pendingApplied;
          const mergedJobs = serverJobs.map((job) =>
            Object.prototype.hasOwnProperty.call(pending, job.jobId)
              ? { ...job, applied: pending[job.jobId] }
              : job,
          );

          set({ jobs: mergedJobs, isLoading: false });
        } catch (err: any) {
          set({
            isLoading: false,
            lastError: err?.message || "Failed to load matched jobs",
          });
        }
      },

      toggleApplied: (jobId: string) => {
        const currentJob = get().jobs.find((j) => j.jobId === jobId);
        const nextApplied = currentJob ? !currentJob.applied : true;
        get().setApplied(jobId, nextApplied);
      },

      setApplied: (jobId: string, applied: boolean) => {
        set((state) => {
          const nextJobs = state.jobs.map((job) =>
            job.jobId === jobId ? { ...job, applied } : job,
          );
          const nextPending = {
            ...state.pendingApplied,
            [jobId]: applied,
          };
          return {
            jobs: nextJobs,
            pendingApplied: nextPending,
          };
        });

        const pendingCount = Object.keys(get().pendingApplied).length;
        if (pendingCount >= APPLIED_BATCH_SIZE) {
          void get().flushPendingApplied();
        }
      },

      flushPendingApplied: async (options?: FlushOptions) => {
        const snapshot = { ...get().pendingApplied };
        const entries = Object.entries(snapshot);
        if (entries.length === 0) {
          return true;
        }

        if (activeFlushPromise && !options?.keepalive) {
          return activeFlushPromise;
        }

        const updates = entries.map(([jobId, applied]) => ({
          jobId,
          applied,
        }));

        const runFlush = async (): Promise<boolean> => {
          if (!options?.keepalive) {
            set({ isSyncing: true, lastError: null });
          }

          try {
            const res = await fetch(`${getApiUrl()}/api/v1/job/applied`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ updates }),
              keepalive: Boolean(options?.keepalive),
            });

            if (!res.ok) {
              throw new Error(`Failed to sync applied updates (${res.status})`);
            }

            // Cleanup only entries whose value still matches what was sent & acknowledged
            set((state) => {
              const remaining: Record<string, boolean> = {
                ...state.pendingApplied,
              };
              for (const [id, val] of entries) {
                if (remaining[id] === val) {
                  delete remaining[id];
                }
              }
              return {
                pendingApplied: remaining,
                isSyncing: false,
                lastSyncedAt: new Date().toISOString(),
                lastError: null,
              };
            });

            return true;
          } catch (err: any) {
            if (!options?.keepalive) {
              set({
                isSyncing: false,
                lastError: err?.message || "Failed to sync applied statuses",
              });
            }
            return false;
          } finally {
            if (!options?.keepalive) {
              activeFlushPromise = null;
            }
          }
        };

        if (options?.keepalive) {
          return runFlush();
        }

        activeFlushPromise = runFlush();
        return activeFlushPromise;
      },
    }),
    {
      name: "bhaidekhle-jobs-storage",
      partialize: (state) => ({
        jobs: state.jobs,
        pendingApplied: state.pendingApplied,
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
);

