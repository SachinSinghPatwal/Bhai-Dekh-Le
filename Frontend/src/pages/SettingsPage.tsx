import React from "react";
import { FiSettings, FiTrash2, FiCheck } from "react-icons/fi";
import { useCandidateStore } from "../store/useCandidateStore";
import { notifySuccess } from "../utils/toast";

export const SettingsPage: React.FC = () => {
  const { profile, clearProfile } = useCandidateStore();

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset your stored candidate profile?")) {
      clearProfile();
      notifySuccess("Candidate data cleared from local cache.");
    }
  };

  return (
    <div className="space-y-8 px-16 mx-20">
      <div className="border-b border-white/[0.06] pb-6">
        <h1 className="app-heading-page flex items-center gap-2.5">
          <FiSettings className="text-zinc-400" />
          <span>System & Preferences</span>
        </h1>
        <p className="app-sub text-zinc-400 mt-1">
          Configure application layout, data cache, and telemetry preferences
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
        <h2 className="app-card-title text-zinc-300">Layout & Appearance</h2>

        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-white/5">
          <div className="space-y-0.5">
            <span className="app-label text-zinc-200">
              Navigation Sidebar Behavior
            </span>
            <p className="app-caption text-zinc-500">
              Left-docked, collapsed by default (icons only); expands smoothly
              on hover
            </p>
          </div>

          <span className="app-caption text-zinc-400 flex items-center gap-1.5">
            <FiCheck className="text-zinc-400" />
            Auto-Hover
          </span>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-white/5">
          <div className="space-y-0.5">
            <span className="app-label text-zinc-200">Theme</span>
            <p className="app-caption text-zinc-500">
              Clean semi-transparent dark obsidian with neutral slate accents
            </p>
          </div>
          <span className="app-caption text-zinc-400 flex items-center gap-1.5">
            <FiCheck className="text-zinc-400" />
            Active
          </span>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
        <h2 className="app-card-title text-zinc-300">
          Stored Profile Cache (Zustand)
        </h2>

        <div className="p-4 rounded-xl bg-zinc-950/80 border border-white/5 font-mono app-caption text-zinc-400 max-h-48 overflow-y-auto">
          {profile
            ? JSON.stringify(profile, null, 2)
            : "No candidate profile saved."}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-900/40 app-sub font-medium flex items-center gap-2 cursor-pointer transition-colors"
          >
            <FiTrash2 className="text-xs" />
            <span>Clear Stored Profile Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
