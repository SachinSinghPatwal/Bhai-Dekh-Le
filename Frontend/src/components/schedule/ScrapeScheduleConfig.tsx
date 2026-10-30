import React, { useState, useEffect } from "react";
import { FiClock, FiCheck, FiRadio } from "react-icons/fi";
import { notifySuccess, notifyError } from "../../utils/toast";

export type ScrapeDurationMinutes = 10 | 15 | 20 | 30 | 45 | 60;

interface ScheduleOption {
  value: ScrapeDurationMinutes;
  label: string;
  description: string;
}

const SCHEDULE_OPTIONS: readonly ScheduleOption[] = [
  { value: 10, label: "Every 10 minutes", description: "High frequency live monitoring" },
  { value: 15, label: "Every 15 minutes", description: "Active session tracking" },
  { value: 20, label: "Every 20 minutes (Recommended)", description: "Balanced scraping pace" },
  { value: 30, label: "Every 30 minutes", description: "Steady automated intervals" },
  { value: 45, label: "Every 45 minutes", description: "Low frequency polling" },
  { value: 60, label: "Every 1 hour", description: "Conservative hourly batch" },
] as const;

export const ScrapeScheduleConfig: React.FC = () => {
  const apiUrl =
    import.meta.env.VITE_BACKEND_URL ||
    (typeof window !== "undefined"
      ? `http://${window.location.hostname}:8000`
      : "http://localhost:8000");

  const [intervalMinutes, setIntervalMinutes] =
    useState<ScrapeDurationMinutes>(20);
  const [nextScrapeAt, setNextScrapeAt] = useState<Date | null>(null);
  const [nextScrapeFormatted, setNextScrapeFormatted] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isMounted = true;

    const fetchCurrentSchedule = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/v1/job/schedule`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.data) {
            if (json.data.intervalMinutes) {
              setIntervalMinutes(json.data.intervalMinutes as ScrapeDurationMinutes);
            }
            if (json.data.nextScrapeAt) {
              setNextScrapeAt(new Date(json.data.nextScrapeAt));
            }
            if (json.data.nextScrapeFormatted) {
              setNextScrapeFormatted(json.data.nextScrapeFormatted);
            }
            if (typeof json.data.isRunning === "boolean") {
              setIsRunning(json.data.isRunning);
            }
          }
        }
      } catch {}
    };

    const setupSse = () => {
      try {
        eventSource = new EventSource(`${apiUrl}/api/v1/job/schedule/stream`);
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (isMounted && data) {
              if (data.intervalMinutes) {
                setIntervalMinutes(data.intervalMinutes as ScrapeDurationMinutes);
              }
              if (data.nextScrapeAt) {
                setNextScrapeAt(new Date(data.nextScrapeAt));
              }
              if (data.nextScrapeFormatted) {
                setNextScrapeFormatted(data.nextScrapeFormatted);
              }
              if (typeof data.isRunning === "boolean") {
                setIsRunning(data.isRunning);
              }
            }
          } catch {}
        };
      } catch {}
    };

    void fetchCurrentSchedule();
    setupSse();

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [apiUrl]);

  const handleUpdate = async (minutes: ScrapeDurationMinutes) => {
    if (isUpdating || minutes === intervalMinutes) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/job/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intervalMinutes: minutes }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to update scraping schedule");
      }

      setIntervalMinutes(minutes);
      if (json.data?.nextScrapeAt) {
        setNextScrapeAt(new Date(json.data.nextScrapeAt));
      }
      if (json.data?.nextScrapeFormatted) {
        setNextScrapeFormatted(json.data.nextScrapeFormatted);
      }
      notifySuccess(
        `Scrape frequency updated to every ${minutes === 60 ? "1 hour" : `${minutes}m`}. New scrape dispatched immediately.`,
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update scraping schedule";
      notifyError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="glass-panel p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
        <div>
          <h2 className="app-card-title text-zinc-100 flex items-center gap-2">
            <FiClock className="text-emerald-400" />
            <span>Automated Scraping Schedule</span>
          </h2>
          <p className="app-sub text-zinc-400 mt-1">
            Configure background scraping frequency. Selecting any interval immediately runs a scrape and sets the schedule with no duplicate jobs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="app-caption px-2.5 py-1 rounded bg-zinc-900 border border-white/10 font-mono text-zinc-300">
            Current: Every {intervalMinutes === 60 ? "1 hr" : `${intervalMinutes}m`}
          </span>
          <span
            className={`app-caption px-2.5 py-1 rounded border font-medium ${
              isRunning
                ? "bg-amber-950/40 border-amber-800/40 text-amber-400"
                : "bg-emerald-950/40 border-emerald-800/40 text-emerald-400"
            }`}
          >
            {isRunning ? "Dispatching..." : "Active"}
          </span>
        </div>
      </div>

      {nextScrapeFormatted && (
        <div className="flex items-center justify-between p-3.5 rounded bg-zinc-950/70 border border-white/5 text-xs font-mono">
          <span className="text-zinc-400">Next Planned Run:</span>
          <span
            className="text-emerald-400 font-semibold cursor-help"
            title={nextScrapeAt ? nextScrapeAt.toISOString() : undefined}
          >
            {nextScrapeFormatted}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {SCHEDULE_OPTIONS.map((opt) => {
          const isSelected = intervalMinutes === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={isUpdating}
              onClick={() => handleUpdate(opt.value)}
              className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                isSelected
                  ? "bg-emerald-950/30 border-emerald-500/50 shadow-sm"
                  : "bg-zinc-900/50 hover:bg-zinc-900/80 border-white/5 hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold ${
                    isSelected ? "text-emerald-300" : "text-zinc-200"
                  }`}
                >
                  {opt.label}
                </span>
                {isSelected ? (
                  <FiCheck className="text-emerald-400 text-sm" />
                ) : (
                  <FiRadio className="text-zinc-600 text-sm" />
                )}
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ScrapeScheduleConfig;
