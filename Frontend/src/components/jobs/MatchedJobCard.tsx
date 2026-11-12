import React from "react";
import {
  FiExternalLink,
  FiCheckCircle,
  FiCircle,
  FiClock,
} from "react-icons/fi";
import type { MatchedJob } from "../../types/candidate";

interface MatchedJobCardProps {
  job: MatchedJob;
  isPending?: boolean;
  onToggleApplied: (jobId: string) => void;
}

export const MatchedJobCard: React.FC<MatchedJobCardProps> = ({
  job,
  isPending = false,
  onToggleApplied,
}) => {
  const locationPlaceholder = job.placeholders?.find(
    (p) => p.type === "location",
  )?.label;
  const experienceLabel =
    job.placeholders?.find((p) => p.type === "experience")?.label ||
    (job.minExp || job.maxExp ? `${job.minExp || "0"}-${job.maxExp || "0"} Yrs` : "");

  return (
    <div className="p-4 sm:p-5 rounded-lg bg-zinc-900/60 border border-white/[0.07] hover:border-white/15 transition-colors flex flex-col justify-between gap-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-zinc-100 leading-snug">
              {job.title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
              {job.companyName && (
                <span className="font-medium text-zinc-300">
                  {job.companyName}
                </span>
              )}
              {experienceLabel && (
                <>
                  <span>•</span>
                  <span>{experienceLabel}</span>
                </>
              )}
              {locationPlaceholder && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[200px]">
                    {locationPlaceholder}
                  </span>
                </>
              )}
            </div>
          </div>

          {job.matchScore !== null && (
            <span className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold">
              {job.matchScore}% Match
            </span>
          )}
        </div>

        {job.keySkills.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
              Key Skills
            </span>
            <div className="flex flex-wrap gap-1.5">
              {job.keySkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-0.5 rounded bg-zinc-800/80 border border-white/10 text-zinc-200 text-xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {job.aiSummary && (
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
            {job.aiSummary}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => onToggleApplied(job.jobId)}
          className={`h-8 px-3 rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer border ${
            job.applied
              ? "bg-emerald-950/60 hover:bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
              : "bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 border-white/10"
          }`}
        >
          {job.applied ? (
            <>
              <FiCheckCircle className="text-emerald-400" size={13} />
              <span>Applied</span>
            </>
          ) : (
            <>
              <FiCircle className="text-zinc-400" size={13} />
              <span>Not Applied</span>
            </>
          )}
          {isPending && (
            <span
              className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-amber-400 font-mono"
              title="Saved locally in Zustand, queued for batch sync"
            >
              <FiClock size={10} />
              pending
            </span>
          )}
        </button>

        {job.jdURL ? (
          <a
            href={job.jdURL}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3.5 rounded bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <span>Apply</span>
            <FiExternalLink size={12} />
          </a>
        ) : (
          <span className="text-xs text-zinc-500">No apply link</span>
        )}
      </div>
    </div>
  );
};

