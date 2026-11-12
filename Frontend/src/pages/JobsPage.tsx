import React, { useEffect, useMemo, useState } from "react";
import {
  FiBriefcase,
  FiSearch,
  FiRefreshCw,
  FiCheckCircle,
  FiUploadCloud,
} from "react-icons/fi";
import { useJobStore } from "../store/useJobStore";
import { MatchedJobCard } from "../components/jobs/MatchedJobCard";
import { notifyError, notifySuccess } from "../utils/toast";

type FilterTab = "all" | "not_applied" | "applied";

export const JobsPage: React.FC = () => {
  const {
    jobs,
    pendingApplied,
    isLoading,
    isSyncing,
    fetchMatchedJobs,
    toggleApplied,
    flushPendingApplied,
  } = useJobStore();

  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const syncAndLoad = async () => {
      await flushPendingApplied();
      await fetchMatchedJobs();
    };
    void syncAndLoad();
  }, [fetchMatchedJobs, flushPendingApplied]);

  const pendingCount = Object.keys(pendingApplied).length;
  const appliedCount = useMemo(
    () => jobs.filter((j) => j.applied).length,
    [jobs],
  );
  const notAppliedCount = jobs.length - appliedCount;

  const filteredJobs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return jobs.filter((job) => {
      if (filterTab === "applied" && !job.applied) return false;
      if (filterTab === "not_applied" && job.applied) return false;
      if (!q) return true;
      return (
        job.title.toLowerCase().includes(q) ||
        job.companyName.toLowerCase().includes(q) ||
        job.keySkills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [jobs, filterTab, searchTerm]);

  const handleManualSync = async () => {
    const ok = await flushPendingApplied();
    if (ok) {
      notifySuccess("Applied statuses synced to backend.");
      await fetchMatchedJobs();
    } else {
      notifyError("Failed to sync applied updates. They remain queued locally.");
    }
  };

  return (
    <div className="space-y-6 px-1 sm:px-4 md:px-8 mx-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
        <div>
          <h1 className="app-heading-page flex items-center gap-2.5">
            <FiBriefcase className="text-zinc-400" />
            <span>AI-Matched Jobs</span>
          </h1>
          <p className="app-sub text-zinc-400 mt-1">
            Resume-filtered openings with apply links and batched status sync
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pendingCount > 0 && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => void handleManualSync()}
              className="h-9 px-3.5 rounded bg-amber-950/50 hover:bg-amber-950/80 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
            >
              <FiUploadCloud
                className={isSyncing ? "animate-pulse" : ""}
                size={14}
              />
              <span>
                {isSyncing ? "Syncing..." : `Sync Pending (${pendingCount})`}
              </span>
            </button>
          )}

          <button
            type="button"
            disabled={isLoading}
            onClick={() => void fetchMatchedJobs()}
            className="h-9 px-3.5 rounded bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-white/10 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <FiRefreshCw
              className={`text-zinc-400 ${isLoading ? "animate-spin" : ""}`}
              size={14}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="glass-panel p-4 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: "all", label: `All (${jobs.length})` },
                { id: "not_applied", label: `Not Applied (${notAppliedCount})` },
                { id: "applied", label: `Applied (${appliedCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer border ${
                  filterTab === tab.id
                    ? "bg-zinc-100 text-zinc-950 border-zinc-100"
                    : "bg-zinc-900/70 text-zinc-400 hover:text-zinc-200 border-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              size={14}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by title, company, or skill..."
              className="w-full h-9 pl-9 pr-3 rounded glass-input text-xs text-zinc-200 placeholder-zinc-500 border border-white/10"
            />
          </div>
        </div>

        {isLoading && jobs.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 app-sub">
            Loading AI-matched jobs...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <FiCheckCircle className="mx-auto text-zinc-500" size={24} />
            <p className="app-card-title text-zinc-300">
              {jobs.length === 0
                ? "No AI-matched jobs yet"
                : "No jobs match your current filter"}
            </p>
            <p className="app-sub text-zinc-400 max-w-md mx-auto">
              {jobs.length === 0
                ? "Matched openings will appear here once AI evaluation completes."
                : "Try switching filter tabs or clearing your search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredJobs.map((job) => (
              <MatchedJobCard
                key={job.jobId}
                job={job}
                isPending={Object.prototype.hasOwnProperty.call(
                  pendingApplied,
                  job.jobId,
                )}
                onToggleApplied={toggleApplied}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
