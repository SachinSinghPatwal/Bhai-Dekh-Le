import React from "react";
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
} from "react-icons/fi";
import { useCandidateStore } from "../../store/useCandidateStore";

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { profile, jobStats } = useCandidateStore();

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
    <div className="space-y-8  px-16 mx-20">
      {/* Top Welcome & Candidate Summary Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Subtle accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-400/20 to-transparent" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
              <span className="app-caption uppercase tracking-wider text-zinc-400 font-medium">
                CMS Candidate Telemetry
              </span>
            </div>
            <h1 className="app-heading-page">
              {profile?.fullName
                ? `Welcome, ${profile.fullName}`
                : "Career Dashboard"}
            </h1>
            <p className="app-body text-zinc-400 max-w-2xl leading-relaxed">
              Targeting{" "}
              <span className="text-zinc-200 font-medium">
                {profile?.role || "Software Engineer"}
              </span>{" "}
              • Expected:{" "}
              <span className="text-zinc-200 font-medium">
                {profile?.expectedSalary || "Market Rate"}
              </span>{" "}
              • {profile?.experienceYears || "0"} Years Experience
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate("/details")}
              className="px-4 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-white/10 app-sub font-medium flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <FiEdit3 className="text-zinc-400" />
              <span>Change Profile Details</span>
            </button>
          </div>
        </div>

        {/* Profile Quick Pill Stats */}
        {profile && (
          <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-wrap items-center gap-4 app-sub text-zinc-400">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-white/5">
              <span className="text-zinc-500">Education:</span>
              <span className="text-zinc-200 capitalize">
                {profile.graduationStatus} ({profile.graduationYear})
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-white/5">
              <span className="text-zinc-500">Skills Indexed:</span>
              <span className="text-zinc-200">
                {profile.skills.length} skills
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-white/5">
              <span className="text-zinc-500">Keywords Tracked:</span>
              <span className="text-zinc-200">
                {profile.searchKeywords.length} portal queries
              </span>
            </div>

            {profile.resumeFileName && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-white/5">
                <span className="text-zinc-500">Resume:</span>
                <span className="text-zinc-200 truncate max-w-[150px]">
                  {profile.resumeFileName}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="glass-panel rounded-2xl p-5 border border-white/[0.07] space-y-3 relative group transition-all duration-200 hover:border-white/15"
            >
              <div className="flex items-center justify-between">
                <span className="app-label text-zinc-400">{card.title}</span>
                <div className="w-8 h-8 rounded-lg bg-zinc-900/80 border border-white/10 flex items-center justify-center text-zinc-400">
                  <Icon className="text-sm" />
                </div>
              </div>

              <div>
                <span className="app-stat">{card.value}</span>
                <p className="app-caption text-zinc-500 mt-1">{card.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Graphs Section (Recharts showing clean empty / zero state) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph 1: Weekly Application Velocity */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-white/[0.07] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="app-heading-section text-zinc-200">
                Application & Interview Velocity
              </h3>
              <p className="app-sub text-zinc-500 mt-0.5">
                Weekly pacing of sent submissions and inbound recruiter
                responses
              </p>
            </div>
            <span className="app-caption text-zinc-500 px-2.5 py-1 rounded-md bg-zinc-900/60 border border-white/5">
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
                    borderRadius: "8px",
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

          {/* Graph Footer Note */}
          <div className="text-center py-2 px-3 rounded-lg bg-zinc-900/40 border border-white/5 app-caption text-zinc-500">
            Graphs default to baseline zero until your first job application is
            recorded.
          </div>
        </div>

        {/* Graph 2: Pipeline Distribution */}
        <div className="glass-panel rounded-2xl p-6 border border-white/[0.07] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="app-heading-section text-zinc-200">
                Pipeline Funnel
              </h3>
              <span className="app-caption text-zinc-500">0 Total</span>
            </div>
            <p className="app-sub text-zinc-500 mt-0.5">
              Distribution across stages
            </p>
          </div>

          <div className="h-56 w-full pt-2">
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
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                />
                <YAxis
                  domain={[0, 4]}
                  allowDecimals={false}
                  stroke="#71717a"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(18, 18, 22, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    color: "#f4f4f5",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" fill="#52525b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-white/5 app-caption text-zinc-500 text-center">
            Zero active candidates in pipeline
          </div>
        </div>
      </div>

      {/* Elegant Empty State & Next Actions */}
      <div className="glass-panel rounded-2xl p-8 border border-white/[0.07] text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-900/80 border border-white/10 flex items-center justify-center text-zinc-400 mx-auto">
          <FiInbox className="text-xl" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h4 className="app-heading-section text-zinc-200">
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
            className="px-4 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-white/10 app-sub font-medium flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <FiSearch className="text-xs text-zinc-400" />
            <span>View Job Targeting Keywords</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/details")}
            className="px-4 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] text-zinc-300 border border-white/5 app-sub font-medium flex items-center gap-2 cursor-pointer transition-colors"
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
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.07] space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="app-card-title text-zinc-300 flex items-center gap-2">
                <FiSearch className="text-zinc-400" />
                <span>Job Portal Search Queries</span>
              </h4>
              <span className="app-caption text-zinc-500">
                {profile.searchKeywords.length} active
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {profile.searchKeywords.map((kw) => (
                <span
                  key={kw}
                  className="px-3 py-1.5 rounded-lg app-sub bg-zinc-900/60 text-zinc-300 border border-white/10"
                >
                  "{kw}"
                </span>
              ))}
            </div>
          </div>

          {/* Verified Skills */}
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.07] space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="app-card-title text-zinc-300 flex items-center gap-2">
                <FiCode className="text-zinc-400" />
                <span>Profile Skills Index</span>
              </h4>
              <span className="app-caption text-zinc-500">
                {profile.skills.length} skills
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 rounded-lg app-sub bg-zinc-900/60 text-zinc-300 border border-white/10"
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
