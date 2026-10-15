import React from "react";
import { useNavigate } from "react-router-dom";
import { FiBriefcase, FiSearch, FiEdit3, FiExternalLink } from "react-icons/fi";
import { useCandidateStore } from "../store/useCandidateStore";

export const JobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useCandidateStore();

  return (
    <div className="space-y-8  px-16 mx-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <h1 className="app-heading-page flex items-center gap-2.5">
            <FiBriefcase className="text-zinc-400" />
            <span>Target Jobs & Keyword Feeds</span>
          </h1>
          <p className="app-sub text-zinc-400 mt-1">
            Configured job portal search strings and target opportunity criteria
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/details")}
          className="px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-white/10 app-sub font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <FiEdit3 className="text-zinc-400" />
          <span>Edit Target Criteria</span>
        </button>
      </div>

      {/* Keywords Quick Search Links */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
        <h2 className="app-card-title text-zinc-300 flex items-center gap-2">
          <FiSearch className="text-zinc-400" />
          <span>Active Search Portal Queries</span>
        </h2>

        {profile?.searchKeywords && profile.searchKeywords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.searchKeywords.map((keyword) => (
              <div
                key={keyword}
                className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex items-center justify-between group hover:border-white/15 transition-colors"
              >
                <div className="space-y-1">
                  <span className="app-label text-zinc-200">"{keyword}"</span>
                  <p className="app-caption text-zinc-500">
                    Filtered for role: {profile.role}
                  </p>
                </div>
                <a
                  href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keyword)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-zinc-800/80 text-zinc-400 group-hover:text-zinc-200 hover:bg-zinc-700/80 transition-colors"
                  title="Search on LinkedIn"
                >
                  <FiExternalLink className="text-xs" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-500 app-sub">
            No keywords registered. Go to Change Details to add job keywords.
          </div>
        )}
      </div>

      {/* Empty Jobs List Placeholder */}
      <div className="glass-panel rounded-2xl p-8 border border-white/[0.07] text-center space-y-3">
        <span className="app-card-title text-zinc-400">
          Job Applications Queue
        </span>
        <p className="app-sub text-zinc-500 max-w-sm mx-auto">
          You haven't tracked any job applications yet. Your submissions and
          follow-up stages will be indexed here.
        </p>
      </div>
    </div>
  );
};
