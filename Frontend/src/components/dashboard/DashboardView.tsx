import React, { useState, useEffect } from "react";
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
} from "recharts";
import {
  FiBriefcase,
  FiTrendingUp,
  FiCheckCircle,
  FiClock,
  FiActivity,
  FiHelpCircle,
} from "react-icons/fi";
import { useCandidateStore } from "../../store/useCandidateStore";

const SCRAPE_INTERVAL_MINUTES = 5;

export const DashboardView: React.FC = () => {
  const { profile, jobStats } = useCandidateStore();

  const searchKeywords = profile?.searchKeywords?.filter(Boolean) || [];
  const currentScrapeJob =
    searchKeywords[0] || profile?.role || "Software Engineer";
  const nextScrapeJob =
    searchKeywords[1] ||
    (profile?.role && profile.role !== currentScrapeJob
      ? profile.role
      : searchKeywords[0]
        ? "Full Stack Developer"
        : "Backend Developer");

  const [nextScrapeAt, setNextScrapeAt] = useState<Date>(
    () => new Date(Date.now() + SCRAPE_INTERVAL_MINUTES * 60 * 1000),
  );
  const [countdownSeconds, setCountdownSeconds] = useState<number>(
    SCRAPE_INTERVAL_MINUTES * 60,
  );

  const formatScheduleDateTime = (date: Date): string => {
    const hours24 = date.getHours();
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours = String(hours24 % 12 || 12).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${hours}:${minutes} ${period} ${day}-${month}-${year}`;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((nextScrapeAt.getTime() - Date.now()) / 1000),
      );
      if (remaining === 0) {
        const nextTarget = new Date(
          Date.now() + SCRAPE_INTERVAL_MINUTES * 60 * 1000,
        );
        setNextScrapeAt(nextTarget);
        setCountdownSeconds(SCRAPE_INTERVAL_MINUTES * 60);
      } else {
        setCountdownSeconds(remaining);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [nextScrapeAt]);

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const activityData = [
    { day: "Mon", applied: 0, responses: 0 },
    { day: "Tue", applied: 0, responses: 0 },
    { day: "Wed", applied: 0, responses: 0 },
    { day: "Thu", applied: 0, responses: 0 },
    { day: "Fri", applied: 0, responses: 0 },
    { day: "Sat", applied: 0, responses: 0 },
    { day: "Sun", applied: 0, responses: 0 },
  ];

  const pipelineData = [
    { stage: "Saved", count: 0 },
    { stage: "Applied", count: 0 },
    { stage: "Screening", count: 0 },
    { stage: "Interview", count: 0 },
    { stage: "Offer", count: 0 },
  ];

  const statCards = [
    {
      title: "Applications Sent",
      value: jobStats.appliedCount,
      subtext: "0 in the last 7 days",
      icon: FiBriefcase,
    },
    {
      title: "In Review / Screening",
      value: jobStats.inReviewCount,
      subtext: "Awaiting recruiter response",
      icon: FiClock,
    },
    {
      title: "Interviews Scheduled",
      value: jobStats.interviewsCount,
      subtext: "0% conversion rate",
      icon: FiTrendingUp,
    },
    {
      title: "Offers Received",
      value: jobStats.offersCount,
      subtext: "Target: 1 accepted offer",
      icon: FiCheckCircle,
    },
  ];

  return (
    <div className="space-y-5 px-1 sm:px-4 md:px-8 mx-0">
      <div className="glass-panel p-4 sm:p-5 border border-white/[0.07] space-y-3.5 relative overflow-visible z-30">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent pointer-events-none rounded-t" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="app-heading-section text-zinc-100">Scraper</h3>
              </div>
              <span className="app-caption text-emerald-400 px-2.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 font-medium">
                Active (3/4 Workers Running)
              </span>
            </div>
            <div className="text-[11px] font-mono text-zinc-400">
              Next scheduled:{" "}
              <span className="text-zinc-200">
                {formatScheduleDateTime(nextScrapeAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <div
              className="h-8 px-3 rounded bg-zinc-900/80 border border-white/10 text-xs font-mono text-zinc-300 flex items-center gap-1.5"
              title="Fixed automated scraping interval"
            >
              <FiClock className="text-emerald-400 text-xs shrink-0" />
              <span>Every {SCRAPE_INTERVAL_MINUTES}m</span>
            </div>

            <div className="bg-zinc-900/80 border border-white/10 rounded px-3 py-1.5 flex items-center gap-2 h-8">
              <span className="text-[13px] font-bold font-mono tracking-tight text-zinc-100 leading-tight">
                {formatCountdown(countdownSeconds)}
              </span>
              <span
                className="text-zinc-400 hover:text-zinc-200 transition-colors relative cursor-help inline-flex items-center"
                title={`Next scrape: ${nextScrapeAt.toISOString()} (${formatScheduleDateTime(nextScrapeAt)})`}
              >
                <FiHelpCircle className="text-xs" />
              </span>
            </div>
          </div>
        </div>

        <div className="rounded bg-zinc-900/60 border border-white/[0.06] p-3 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 pr-3 sm:border-r sm:border-white/10 shrink-0">
              <FiActivity className="text-emerald-400 text-xs shrink-0" />
              <span className="text-zinc-400 font-medium">Scrape Queue:</span>
              <span className="font-semibold text-zinc-200">12 Tasks</span>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-zinc-400 font-medium shrink-0">
                Current:
              </span>
              <span
                className="font-medium text-zinc-100 truncate max-w-[200px] sm:max-w-[280px]"
                title={currentScrapeJob}
              >
                "{currentScrapeJob}"
              </span>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" />
              <span className="text-zinc-400 font-medium shrink-0">Next:</span>
              <span
                className="font-medium text-zinc-300 truncate max-w-[200px] sm:max-w-[280px]"
                title={nextScrapeJob}
              >
                "{nextScrapeJob}"
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-zinc-400 text-[11px] font-mono">
            <span>RabbitMQ</span>
            <span>•</span>
            <span className="text-emerald-400">Worker Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="glass-panel p-3.5 sm:p-4 border border-white/[0.07] space-y-1.5 relative group transition-all duration-200 hover:border-white/15"
            >
              <div className="flex items-center justify-between">
                <span className="app-caption text-zinc-400 font-medium ">
                  {card.title}
                </span>
                <div className="w-7 h-7 rounded bg-zinc-900/80 border border-white/10 flex items-center justify-center text-zinc-400 shrink-0">
                  <Icon className="text-xs" />
                </div>
              </div>

              <div>
                <span className="text-2xl font-bold tracking-tight text-zinc-100">
                  {card.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-11 gap-6">
        <div className="lg:col-span-7 glass-panel p-4 sm:p-6 border border-white/[0.07] space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="app-heading-section text-zinc-100">
                Application & Interview Velocity
              </h3>
              <p className="app-sub text-zinc-400">
                Weekly pacing of sent submissions and inbound recruiter
                responses
              </p>
            </div>
            <span className="app-caption text-zinc-400 px-2.5 py-1 rounded bg-zinc-900/60 border border-white/5 font-medium shrink-0">
              Current Week
            </span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activityData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="appliedArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
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
                  domain={[0, 5]}
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
                  dataKey="applied"
                  stroke="#a1a1aa"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#appliedArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 glass-panel p-4 sm:p-6 border border-white/[0.07] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="app-heading-section text-zinc-100">
                  Pipeline Funnel
                </h3>
                <p className="app-sub text-zinc-400">
                  Distribution across stages
                </p>
              </div>
              <span className="app-caption text-zinc-400 px-2.5 py-1 rounded bg-zinc-900/60 border border-white/5 font-medium shrink-0">
                0 Total
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
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
                  domain={[0, 4]}
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
                  fill="#52525b"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={44}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
