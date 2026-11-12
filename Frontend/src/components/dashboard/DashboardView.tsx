import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  FiBriefcase,
  FiTrendingUp,
  FiCheckCircle,
  FiClock,
  FiArrowRight,
  FiUploadCloud,
  FiRefreshCw,
} from "react-icons/fi";
import { useCandidateStore } from "../../store/useCandidateStore";
import { useJobStore } from "../../store/useJobStore";
import { MatchedJobCard } from "../jobs/MatchedJobCard";
import { getApiUrl } from "../../lib/api";
import { notifyError, notifyInfo, notifySuccess } from "../../utils/toast";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const JS_DAY_TO_LABEL = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

const getJobDayLabel = (
  aiEvaluatedAt?: string | null,
  createdDate?: number | null,
): string => {
  const rawTimestamp = aiEvaluatedAt
    ? Date.parse(aiEvaluatedAt)
    : typeof createdDate === "number"
      ? createdDate
      : Date.now();
  const parsedDate = Number.isNaN(rawTimestamp)
    ? new Date()
    : new Date(rawTimestamp);
  return JS_DAY_TO_LABEL[parsedDate.getDay()];
};

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useCandidateStore();
  const {
    jobs,
    pendingApplied,
    isSyncing,
    toggleApplied,
    flushPendingApplied,
    fetchMatchedJobs,
  } = useJobStore();

  const [stageFilter, setStageFilter] = useState<"all" | "saved" | "applied">(
    "all",
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isTriggeringScrape, setIsTriggeringScrape] = useState(false);

  useEffect(() => {
    void fetchMatchedJobs();
    return () => {
      void useJobStore.getState().flushPendingApplied({ keepalive: true });
    };
  }, [fetchMatchedJobs]);

  const pendingCount = Object.keys(pendingApplied).length;
  const totalMatchedCount = jobs.length;
  const appliedMatchedCount = useMemo(
    () => jobs.filter((j) => j.applied).length,
    [jobs],
  );
  const unappliedMatchedCount = totalMatchedCount - appliedMatchedCount;

  const avgMatchScore = useMemo(() => {
    const scored = jobs
      .map((j) => j.matchScore)
      .filter((score): score is number => typeof score === "number");
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((sum, s) => sum + s, 0) / scored.length);
  }, [jobs]);

  const activityData = useMemo(() => {
    const countsByDay = new Map<string, { matched: number; applied: number }>();
    for (const day of WEEK_DAYS) {
      countsByDay.set(day, { matched: 0, applied: 0 });
    }

    for (const job of jobs) {
      const dayLabel = getJobDayLabel(job.aiEvaluatedAt, job.createdDate);
      const entry = countsByDay.get(dayLabel);
      if (entry) {
        entry.matched += 1;
        if (job.applied) {
          entry.applied += 1;
        }
      }
    }

    return WEEK_DAYS.map((day) => {
      const counts = countsByDay.get(day) ?? { matched: 0, applied: 0 };
      return {
        day,
        matched: counts.matched,
        applied: counts.applied,
      };
    });
  }, [jobs]);

  const pipelineData = useMemo(
    () => [
      { stage: "Matched", filterKey: "all" as const, count: totalMatchedCount },
      {
        stage: "Not Applied",
        filterKey: "saved" as const,
        count: unappliedMatchedCount,
      },
      {
        stage: "Applied",
        filterKey: "applied" as const,
        count: appliedMatchedCount,
      },
    ],
    [totalMatchedCount, unappliedMatchedCount, appliedMatchedCount],
  );

  const filteredDashboardJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (stageFilter === "saved" && job.applied) return false;
      if (stageFilter === "applied" && !job.applied) return false;
      if (selectedDay) {
        const dayLabel = getJobDayLabel(job.aiEvaluatedAt, job.createdDate);
        if (dayLabel !== selectedDay) return false;
      }
      return true;
    });
  }, [jobs, stageFilter, selectedDay]);

  const handleRunScrape = async () => {
    if (isTriggeringScrape) return;
    setIsTriggeringScrape(true);
    notifyInfo("Triggering job scrape...");
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/job/trigger-now`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "Failed to trigger scrape");
      }
      notifySuccess("Scrape queued. Matched jobs will appear once scored.");
    } catch (err: unknown) {
      notifyError(
        err instanceof Error ? err.message : "Failed to trigger scrape",
      );
    } finally {
      setIsTriggeringScrape(false);
    }
  };

  const statCards = [
    {
      title: "AI-Matched Jobs",
      value: totalMatchedCount,
      icon: FiBriefcase,
    },
    {
      title: "Not Applied",
      value: unappliedMatchedCount,
      icon: FiClock,
    },
    {
      title: "Applied",
      value: appliedMatchedCount,
      icon: FiCheckCircle,
    },
    {
      title: "Avg Fit Score",
      value: avgMatchScore !== null ? `${avgMatchScore}%` : "—",
      icon: FiTrendingUp,
    },
  ];

  return (
    <div className="space-y-6 px-1 sm:px-4 md:px-8 mx-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
        <div>
          <h1 className="app-heading-page text-zinc-100">Dashboard</h1>
          <p className="app-sub text-zinc-400 mt-1">
            {profile?.role
              ? `Resume-matched openings for ${profile.role}`
              : "Resume-matched openings & application progress"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleRunScrape()}
          disabled={isTriggeringScrape}
          className="h-9 px-3.5 rounded bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/40 text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60 self-start sm:self-auto"
        >
          <FiRefreshCw
            size={13}
            className={isTriggeringScrape ? "animate-spin" : ""}
          />
          <span>{isTriggeringScrape ? "Queueing..." : "Run Scrape Now"}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="glass-panel p-3.5 sm:p-4 border border-white/[0.07] space-y-1.5 hover:border-white/15 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="app-caption text-zinc-400 font-medium">
                  {card.title}
                </span>
                <div className="w-7 h-7 rounded bg-zinc-900/80 border border-white/10 flex items-center justify-center text-zinc-400 shrink-0">
                  <Icon className="text-xs" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-zinc-100">
                {card.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-11 gap-6">
        <div className="lg:col-span-7 glass-panel p-4 sm:p-6 border border-white/[0.07] space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <h3 className="app-heading-section text-zinc-100">
                Weekly Match Velocity
              </h3>
              <p className="app-sub text-zinc-400">
                AI-matched openings vs. applied submissions (click a day to filter)
              </p>
            </div>
            <span className="app-caption text-zinc-400 px-2.5 py-1 rounded bg-zinc-900/60 border border-white/5 font-medium shrink-0">
              {selectedDay ? `Day: ${selectedDay}` : "Weekly"}
            </span>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activityData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(state) => {
                  const clickedDay =
                    typeof state?.activeLabel === "string"
                      ? state.activeLabel
                      : undefined;
                  if (clickedDay) {
                    setSelectedDay((prev) =>
                      prev === clickedDay ? null : clickedDay,
                    );
                  }
                }}
              >
                <defs>
                  <linearGradient id="matchedArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="appliedArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                />
                <XAxis
                  dataKey="day"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                />
                <YAxis
                  domain={[0, "auto"]}
                  allowDecimals={false}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(18, 18, 22, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                    color: "#f4f4f5",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="matched"
                  name="AI Matched"
                  stroke="#34d399"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#matchedArea)"
                />
                <Area
                  type="monotone"
                  dataKey="applied"
                  name="Applied"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#appliedArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 glass-panel p-4 sm:p-6 border border-white/[0.07] space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <h3 className="app-heading-section text-zinc-100">
                Application Funnel
              </h3>
              <p className="app-sub text-zinc-400">Click a bar to filter</p>
            </div>
            <span className="app-caption text-zinc-400 px-2.5 py-1 rounded bg-zinc-900/60 border border-white/5 font-medium shrink-0">
              {totalMatchedCount} Total
            </span>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pipelineData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="stage"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                />
                <YAxis
                  domain={[0, "auto"]}
                  allowDecimals={false}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(18, 18, 22, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                    color: "#f4f4f5",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={44}
                  className="cursor-pointer"
                  onClick={(entry) => {
                    const key = (
                      entry as { filterKey?: "all" | "saved" | "applied" }
                    )?.filterKey;
                    if (key) {
                      setStageFilter((prev) =>
                        prev === key && key !== "all" ? "all" : key,
                      );
                    }
                  }}
                >
                  {pipelineData.map((entry) => {
                    const isSelected = stageFilter === entry.filterKey;
                    const fill = isSelected
                      ? "#34d399"
                      : entry.filterKey === "applied"
                        ? "#38bdf8"
                        : entry.filterKey === "saved"
                          ? "#a1a1aa"
                          : "#52525b";
                    return <Cell key={entry.stage} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-panel p-4 sm:p-6 border border-white/[0.07] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="app-heading-section text-zinc-100">
              AI-Matched Openings ({filteredDashboardJobs.length}
              {stageFilter !== "all" || selectedDay
                ? ` of ${totalMatchedCount}`
                : ""}
              )
            </h3>
            <p className="app-sub text-zinc-400">
              Toggling Applied updates charts locally and batch-syncs via Zustand
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-zinc-900/70 border border-white/10 rounded p-0.5 text-xs">
              {(
                [
                  { id: "all", label: `All (${totalMatchedCount})` },
                  { id: "saved", label: `Not Applied (${unappliedMatchedCount})` },
                  { id: "applied", label: `Applied (${appliedMatchedCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStageFilter(tab.id)}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    stageFilter === tab.id
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="h-8 px-2.5 rounded bg-emerald-950/50 hover:bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-xs font-medium cursor-pointer"
              >
                Day: {selectedDay} ×
              </button>
            )}
            {pendingCount > 0 && (
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => void flushPendingApplied()}
                className="h-8 px-3 rounded bg-amber-950/50 hover:bg-amber-950/80 text-amber-300 border border-amber-500/30 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                <FiUploadCloud size={13} />
                <span>
                  {isSyncing ? "Syncing..." : `Sync Pending (${pendingCount})`}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/jobs")}
              className="h-8 px-3 rounded bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-white/10 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>All Jobs</span>
              <FiArrowRight size={12} />
            </button>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400 border border-dashed border-white/10 rounded-lg">
            No AI-matched jobs yet. Trigger a scrape or wait for AI evaluation to finish.
          </div>
        ) : filteredDashboardJobs.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400 border border-dashed border-white/10 rounded-lg space-y-2">
            <p>No matched jobs in this filter.</p>
            <button
              type="button"
              onClick={() => {
                setStageFilter("all");
                setSelectedDay(null);
              }}
              className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredDashboardJobs.slice(0, 6).map((job) => (
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
