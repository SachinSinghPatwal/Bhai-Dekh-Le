import React, { useState, useEffect } from "react";
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
} from "recharts";
import {
  FiBriefcase,
  FiTrendingUp,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiSearch,
  FiInbox,
  FiCode,
  FiActivity,
  FiHelpCircle,
} from "react-icons/fi";
import { useCandidateStore } from "../../store/useCandidateStore";

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { profile, jobStats } = useCandidateStore();

  // Determine current and next scrape job titles from candidate profile / target searches
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

  // Countdown timer in seconds until next scheduled scraping cycle (e.g. 5 mins = 300s)
  const [countdownSeconds, setCountdownSeconds] = useState(285);
  const [isScrapingNow] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Recharts timeline data - defaulted to 0 as user hasn't started applying or tracking yet
  const activityData = [
    { day: "Mon", applied: 0, responses: 0 },
    { day: "Tue", applied: 0, responses: 0 },
    { day: "Wed", applied: 0, responses: 0 },
    { day: "Thu", applied: 0, responses: 0 },
    { day: "Fri", applied: 0, responses: 0 },
    { day: "Sat", applied: 0, responses: 0 },
    { day: "Sun", applied: 0, responses: 0 },
  ];

  // Pipeline stages distribution data - defaulted to 0
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
    <div className="space-y-5 px-16 mx-10">
      {/* Worker & Scraper Fleet Telemetry Panel */}
      <div className="glass-panel p-4 sm:p-5 border border-white/[0.07] space-y-3.5 relative overflow-hidden">
        {/* Subtle accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Active Worker Status */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="app-heading-section text-zinc-100">Scraper</h3>
              </div>
              <span className="app-caption text-emerald-400 px-2.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 font-medium">
                {isScrapingNow
                  ? "Active Dispatch..."
                  : "Active (3/4 Workers Running)"}
              </span>
            </div>
          </div>

          {/* Right: Next Scrape Countdown Timer & Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-zinc-900/80 border border-white/10 rounded px-3.5 py-1.5 flex items-center gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-bold font-mono tracking-tight text-zinc-100 leading-tight">
                  {formatCountdown(countdownSeconds)}
                </span>
                <span className="text-zinc-400 hover:text-zinc-200 transition-colors relative cursor-help inline-flex items-center after:content-['Next_Scrape'] after:absolute after:top-6 after:left-1/2 after:-translate-x-1/2 after:mb-1.5 after:hidden hover:after:block after:px-2 after:py-0.5 after:rounded after:bg-zinc-900 after:border after:border-white/10 after:text-[11px] after:font-medium after:text-zinc-200 after:shadow-xl after:whitespace-nowrap after:z-50 after:pointer-events-none">
                  <FiHelpCircle className="text-xs" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrape Queue Sub-Section: Queue Status, Current Title, and Next Title */}
        <div className="rounded bg-zinc-900/60 border border-white/[0.06] p-3 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Queue Counter */}
            <div className="flex items-center gap-2 pr-3 sm:border-r sm:border-white/10 shrink-0">
              <FiActivity className="text-emerald-400 text-xs shrink-0" />
              <span className="text-zinc-400 font-medium">Scrape Queue:</span>
              <span className="font-semibold text-zinc-200">12 Tasks</span>
            </div>

            {/* Current Scraping Job Title */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-zinc-400 font-medium shrink-0">Current:</span>
              <span
                className="font-medium text-zinc-100 truncate max-w-[200px] sm:max-w-[280px]"
                title={currentScrapeJob}
              >
                "{currentScrapeJob}"
              </span>
            </div>

            {/* Next Queued Job Title */}
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

      {/* 4 Metric Cards */}
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

      {/* Graphs Section (Recharts showing clean empty / zero state) */}
      <div className="grid grid-cols-1 lg:grid-cols-11 gap-6">
        {/* Graph 1: Weekly Application Velocity */}
        <div className="lg:col-span-7 glass-panel p-6 border border-white/[0.07] space-y-4">
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

        {/* Graph 2: Pipeline Distribution */}
        <div className="lg:col-span-4 glass-panel p-6 border border-white/[0.07] space-y-4 flex flex-col justify-between">
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

      {/* Elegant Empty State & Next Actions */}
      <div className="glass-panel p-8 border border-white/[0.07] text-center space-y-4">
        <div className="w-12 h-12 rounded bg-zinc-900/80 border border-white/10 flex items-center justify-center text-zinc-400 mx-auto">
          <FiInbox className="text-xl" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h4 className="app-heading-section text-zinc-100">
            No Application Data Recorded Yet
          </h4>
          <p className="app-sub text-zinc-400 leading-relaxed">
            Your candidate profile and search queries are set up. Once you start
            tracking submissions on job portals, your response rates, interview
            charts, and funnel metrics will populate live here.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/jobs")}
            className="px-4 py-2 rounded bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-white/10 app-sub font-medium flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <FiSearch className="text-xs text-zinc-400" />
            <span>View Job Targeting Keywords</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/details")}
            className="px-4 py-2 rounded bg-white/[0.03] hover:bg-white/[0.07] text-zinc-300 border border-white/5 app-sub font-medium flex items-center gap-2 cursor-pointer transition-colors"
          >
            <FiEdit3 className="text-xs text-zinc-400" />
            <span>Update Details</span>
          </button>
        </div>
      </div>

      {/* Target Keywords & Skills Showcase */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tracked Job Portal Keywords */}
          <div className="glass-panel p-6 border border-white/[0.07] space-y-4">
            <div className="flex items-center justify-between pb-3">
              <h4 className="app-heading-section text-zinc-100 flex items-center gap-2">
                <FiSearch className="text-zinc-400 text-sm" />
                <span>Job Portal Search Queries</span>
              </h4>
              <span className="app-caption text-zinc-400 px-2.5 py-1 rounded bg-zinc-900/60 border border-white/5 font-medium">
                {profile.searchKeywords.length} active
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {profile.searchKeywords.map((kw) => (
                <span
                  key={kw}
                  className="px-3 py-1.5 rounded app-sub bg-zinc-900/60 text-zinc-300 border border-white/10"
                >
                  "{kw}"
                </span>
              ))}
            </div>
          </div>

          {/* Verified Skills */}
          <div className="glass-panel p-6 border border-white/[0.07] space-y-4">
            <div className="flex items-center justify-between pb-3">
              <h4 className="app-heading-section text-zinc-100 flex items-center gap-2">
                <FiCode className="text-zinc-400 text-sm" />
                <span>Profile Skills Index</span>
              </h4>
              <span className="app-caption text-zinc-400 px-2.5 py-1 rounded bg-zinc-900/60 border border-white/5 font-medium">
                {profile.skills.length} skills
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 rounded app-sub bg-zinc-900/60 text-zinc-300 border border-white/10"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
