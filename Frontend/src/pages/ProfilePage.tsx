import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiFileText,
  FiClock,
  FiSliders,
  FiSave,
  FiUpload,
  FiCheck,
  FiTrash2,
  FiPlus,
  FiExternalLink,
  FiSearch,
  FiMail,
  FiPhone,
  FiGlobe,
  FiRefreshCw,
  FiRadio,
  FiArrowLeft,
  FiLoader,
  FiEdit3,
  FiX,
} from "react-icons/fi";
import { FaGithub, FaLinkedin } from "react-icons/fa6";
import { useCandidateStore } from "../store/useCandidateStore";
import { notifySuccess, notifyError, notifyInfo } from "../utils/toast";
import { parseResumeFile } from "../utils/resumeParser";
import type { CandidateProfile } from "../types/candidate";

export type ScrapeDurationMinutes = 10 | 15 | 20 | 30 | 45 | 60;

const SCHEDULE_OPTIONS: readonly {
  value: ScrapeDurationMinutes;
  label: string;
  description: string;
}[] = [
  {
    value: 10,
    label: "Every 10 minutes",
    description: "High frequency live monitoring",
  },
  {
    value: 15,
    label: "Every 15 minutes",
    description: "Active session tracking",
  },
  {
    value: 20,
    label: "Every 20 minutes (Recommended)",
    description: "Balanced scraping pace",
  },
  {
    value: 30,
    label: "Every 30 minutes",
    description: "Steady automated intervals",
  },
  {
    value: 45,
    label: "Every 45 minutes",
    description: "Low frequency polling",
  },
  {
    value: 60,
    label: "Every 1 hour",
    description: "Conservative hourly batch",
  },
] as const;

const POPULAR_SKILLS = [
  "React",
  "Node.js",
  "TypeScript",
  "JavaScript",
  "Python",
  "Tailwind CSS",
  "Next.js",
  "MongoDB",
  "PostgreSQL",
  "Docker",
  "AWS",
  "Redux",
  "Zustand",
  "REST API",
  "GraphQL",
  "Git",
  "CI/CD",
  "Express.js",
];

const FALLBACK_IT_ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "React Developer",
  "Node.js Developer",
  "Python Developer",
  "Java Developer",
  "DevOps Engineer",
  "Cloud Engineer",
  "Data Scientist",
  "Data Analyst",
  "Machine Learning Engineer",
  "AI Engineer",
  "Mobile Developer",
  "Android Developer",
  "iOS Developer",
  "QA Engineer",
  "Site Reliability Engineer (SRE)",
  "Database Administrator",
  "UI/UX Designer",
  "Product Manager",
  "Software Architect",
  "Security Engineer",
];

interface SavedProfileState {
  fullName: string;
  role: string;
  email: string;
  phone: string;
  links: string[];
  skills: string[];
  resumeUrl: string;
  resumeFileName: string;
}

const getApiUrl = () =>
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined"
    ? `http://${window.location.hostname}:8000`
    : "http://localhost:8000");

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, setProfile } = useCandidateStore();
  const apiUrl = getApiUrl();

  const [isLoadingBackend, setIsLoadingBackend] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isScrapingNow, setIsScrapingNow] = useState<boolean>(false);

  // Edit Mode Toggle
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Baseline Saved State for Dirty Checking
  const [savedData, setSavedData] = useState<SavedProfileState>({
    fullName: profile?.fullName || "",
    role: profile?.role || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    links: profile?.links || [],
    skills: profile?.skills || [],
    resumeUrl: profile?.resumeUrl || "",
    resumeFileName: profile?.resumeFileName || "",
  });

  // Active Form State
  const [fullName, setFullName] = useState<string>(profile?.fullName || "");
  const [role, setRole] = useState<string>(profile?.role || "");
  const [email, setEmail] = useState<string>(profile?.email || "");
  const [phone, setPhone] = useState<string>(profile?.phone || "");
  const [links, setLinks] = useState<string[]>(profile?.links || []);
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [resumeUrl, setResumeUrl] = useState<string>(profile?.resumeUrl || "");
  const [resumeFileName, setResumeFileName] = useState<string>(
    profile?.resumeFileName || "",
  );

  // Resume Upload & Extraction State
  const [selectedResumeFile, setSelectedResumeFile] = useState<File | null>(
    null,
  );
  const [isExtractingResume, setIsExtractingResume] = useState<boolean>(false);

  // Helper Inputs
  const [newSkillInput, setNewSkillInput] = useState<string>("");
  const [newLinkInput, setNewLinkInput] = useState<string>("");

  // Role Dropdown State
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState<boolean>(false);
  const [roleSearchTerm, setRoleSearchTerm] = useState<string>(
    profile?.role || "",
  );
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // Schedule State (merged from Settings)
  const [intervalMinutes, setIntervalMinutes] =
    useState<ScrapeDurationMinutes>(20);
  const [savedIntervalMinutes, setSavedIntervalMinutes] =
    useState<ScrapeDurationMinutes>(20);
  const [nextScrapeAt, setNextScrapeAt] = useState<Date | null>(null);
  const [nextScrapeFormatted, setNextScrapeFormatted] = useState<string>("");
  const [isScheduleRunning, setIsScheduleRunning] = useState<boolean>(false);

  // Sync roleSearchTerm with role
  useEffect(() => {
    setRoleSearchTerm(role);
  }, [role]);

  // Handle outside click for role dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(e.target as Node)
      ) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Dirty State Detection
  const isDirty = useMemo(() => {
    if (selectedResumeFile !== null) return true;
    if (fullName.trim() !== savedData.fullName.trim()) return true;
    if (role.trim() !== savedData.role.trim()) return true;
    if (email.trim() !== savedData.email.trim()) return true;
    if (phone.trim() !== savedData.phone.trim()) return true;
    if (resumeUrl !== savedData.resumeUrl) return true;
    if (resumeFileName !== savedData.resumeFileName) return true;
    if (intervalMinutes !== savedIntervalMinutes) return true;

    if (links.length !== savedData.links.length) return true;
    for (let i = 0; i < links.length; i++) {
      if (links[i] !== savedData.links[i]) return true;
    }

    if (skills.length !== savedData.skills.length) return true;
    for (let i = 0; i < skills.length; i++) {
      if (skills[i] !== savedData.skills[i]) return true;
    }

    return false;
  }, [
    fullName,
    role,
    email,
    phone,
    links,
    skills,
    resumeUrl,
    resumeFileName,
    selectedResumeFile,
    intervalMinutes,
    savedData,
    savedIntervalMinutes,
  ]);

  // Fetch initial profile from backend
  useEffect(() => {
    let isMounted = true;
    const fetchUserProfile = async () => {
      try {
        setIsLoadingBackend(true);
        const res = await fetch(`${apiUrl}/api/v1/user/profile`);
        if (!res.ok) return;
        const resJson = await res.json();
        const data = resJson?.data;
        if (isMounted && data) {
          const personal = data.personalDetails || data;
          const remoteFullName =
            data.fullname ||
            personal.fullName ||
            personal.fullname ||
            personal.name ||
            "";
          const remoteRole = data.role || personal.role || "";
          const remoteEmail = data.email || personal.email || "";
          const remotePhone = data.phone || personal.phone || "";
          const remoteSkills = Array.isArray(data.skills)
            ? data.skills
            : Array.isArray(personal.skills)
              ? personal.skills
              : [];
          const remoteLinks = Array.isArray(data.links)
            ? data.links
            : Array.isArray(personal.links)
              ? personal.links
              : [];
          const remoteResumeUrl =
            data.resume?.path ||
            personal.resumePath ||
            personal.resumeLink ||
            personal.resumeUrl ||
            "";
          const remoteResumeFileName =
            data.resume?.fileName || personal.resumeFileName || "";

          if (remoteFullName) setFullName(remoteFullName);
          if (remoteRole) {
            setRole(remoteRole);
            setRoleSearchTerm(remoteRole);
          }
          if (remoteEmail) setEmail(remoteEmail);
          if (remotePhone) setPhone(remotePhone);
          if (remoteSkills.length > 0) setSkills(remoteSkills);
          if (remoteLinks.length > 0) setLinks(remoteLinks);
          if (remoteResumeUrl) setResumeUrl(remoteResumeUrl);
          if (remoteResumeFileName) setResumeFileName(remoteResumeFileName);

          // Update saved baseline
          setSavedData({
            fullName: remoteFullName || profile?.fullName || "",
            role: remoteRole || profile?.role || "",
            email: remoteEmail || profile?.email || "",
            phone: remotePhone || profile?.phone || "",
            links: remoteLinks.length > 0 ? remoteLinks : profile?.links || [],
            skills:
              remoteSkills.length > 0 ? remoteSkills : profile?.skills || [],
            resumeUrl: remoteResumeUrl || profile?.resumeUrl || "",
            resumeFileName:
              remoteResumeFileName || profile?.resumeFileName || "",
          });

          // Sync Zustand store
          if (remoteFullName) {
            setProfile({
              fullName: remoteFullName,
              role: remoteRole || profile?.role || "",
              email: remoteEmail || profile?.email || "",
              phone: remotePhone || profile?.phone || "",
              skills:
                remoteSkills.length > 0 ? remoteSkills : profile?.skills || [],
              links:
                remoteLinks.length > 0 ? remoteLinks : profile?.links || [],
              resumeUrl: remoteResumeUrl || profile?.resumeUrl || "",
              resumeFileName:
                remoteResumeFileName || profile?.resumeFileName || "",
              searchKeywords: [
                remoteRole || profile?.role || "",
                ...(remoteSkills.length > 0
                  ? remoteSkills
                  : profile?.skills || []
                ).slice(0, 3),
              ].filter(Boolean),
            });
          }
        }
      } catch {
        // Fall back gracefully to local store
      } finally {
        if (isMounted) setIsLoadingBackend(false);
      }
    };

    void fetchUserProfile();

    return () => {
      isMounted = false;
    };
  }, [apiUrl]);

  // Fetch Schedule & setup SSE Stream
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
              const minutes = json.data
                .intervalMinutes as ScrapeDurationMinutes;
              setIntervalMinutes(minutes);
              setSavedIntervalMinutes(minutes);
            }
            if (json.data.nextScrapeAt) {
              setNextScrapeAt(new Date(json.data.nextScrapeAt));
            }
            if (json.data.nextScrapeFormatted) {
              setNextScrapeFormatted(json.data.nextScrapeFormatted);
            }
            if (typeof json.data.isRunning === "boolean") {
              setIsScheduleRunning(json.data.isRunning);
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
                const minutes = data.intervalMinutes as ScrapeDurationMinutes;
                setIntervalMinutes(minutes);
                setSavedIntervalMinutes(minutes);
              }
              if (data.nextScrapeAt) {
                setNextScrapeAt(new Date(data.nextScrapeAt));
              }
              if (data.nextScrapeFormatted) {
                setNextScrapeFormatted(data.nextScrapeFormatted);
              }
              if (typeof data.isRunning === "boolean") {
                setIsScheduleRunning(data.isRunning);
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

  // Skill Handlers
  const addSkill = (skillToAdd: string) => {
    if (!isEditing) {
      notifyInfo("Click 'Edit Profile' at the bottom to modify skills.");
      return;
    }
    const clean = skillToAdd.trim();
    if (!clean) return;
    if (skills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      notifyInfo(`"${clean}" is already added.`);
      return;
    }
    setSkills((prev) => [...prev, clean]);
    setNewSkillInput("");
  };

  const removeSkill = (skillToRemove: string) => {
    if (!isEditing) return;
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(newSkillInput);
    }
  };

  // Link Handlers
  const addLink = (linkToAdd: string) => {
    if (!isEditing) {
      notifyInfo("Click 'Edit Profile' at the bottom to add links.");
      return;
    }
    let clean = linkToAdd.trim().replace(/[.,;:)>\]]+$/, "");
    if (!clean) return;
    if (!/^https?:\/\//i.test(clean)) {
      clean = `https://${clean.replace(/^\/+/, "")}`;
    }
    if (links.includes(clean)) {
      notifyInfo("Link is already present in your list.");
      return;
    }
    setLinks((prev) => [...prev, clean]);
    setNewLinkInput("");
  };

  const removeLink = (linkToRemove: string) => {
    if (!isEditing) return;
    setLinks((prev) => prev.filter((l) => l !== linkToRemove));
  };

  const handleLinkKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addLink(newLinkInput);
    }
  };

  // Resume File Selection & Extraction
  const handleResumeSelection = async (file: File) => {
    if (!isEditing) {
      notifyInfo("Click 'Edit Profile' at the bottom to upload a new resume.");
      return;
    }
    setSelectedResumeFile(file);
    setResumeFileName(file.name);
    setIsExtractingResume(true);
    notifyInfo("Scanning resume for skills, contact details, and links...");

    try {
      const parsed = await parseResumeFile(file);

      if (parsed.skills.length > 0) {
        const mergedSkills = Array.from(new Set([...skills, ...parsed.skills]));
        setSkills(mergedSkills);
      }

      if (parsed.email && !email) {
        setEmail(parsed.email);
      }

      if (parsed.phone && !phone) {
        setPhone(parsed.phone);
      }

      if (parsed.links && parsed.links.length > 0) {
        const mergedLinks = Array.from(new Set([...links, ...parsed.links]));
        setLinks(mergedLinks);
      }

      notifySuccess(
        `Parsed "${file.name}": extracted ${parsed.skills.length} skills and ${parsed.links.length} links.`,
      );
    } catch {
      notifyInfo("Resume attached. You can continue adding skills manually.");
    } finally {
      setIsExtractingResume(false);
    }
  };

  // Edit Mode Controls
  const handleStartEditing = () => {
    setIsEditing(true);
    notifyInfo("Edit mode enabled. You can now modify your details.");
  };

  const handleCancelEdit = () => {
    setFullName(savedData.fullName);
    setRole(savedData.role);
    setRoleSearchTerm(savedData.role);
    setEmail(savedData.email);
    setPhone(savedData.phone);
    setLinks(savedData.links);
    setSkills(savedData.skills);
    setResumeUrl(savedData.resumeUrl);
    setResumeFileName(savedData.resumeFileName);
    setSelectedResumeFile(null);
    setIntervalMinutes(savedIntervalMinutes);
    setIsEditing(false);
    notifyInfo("Edits discarded. Reverted to saved details.");
  };

  // Save All Profile & Account Settings to Backend
  const handleSaveProfile = async () => {
    if (!isEditing) {
      notifyInfo("Click 'Edit Profile' first to make changes.");
      return;
    }

    if (!isDirty) {
      notifyInfo("No changes detected to save.");
      return;
    }

    if (!fullName.trim()) {
      notifyError("Full Name is required.");
      return;
    }

    if (!role.trim()) {
      notifyError("Target Role is required.");
      return;
    }

    if (skills.length === 0) {
      notifyError("Please add at least one technical skill.");
      return;
    }

    setIsSaving(true);
    notifyInfo("Saving changes to backend...");

    try {
      let updatedResumeUrl = resumeUrl;
      let updatedResumeFileName = resumeFileName;

      // If a new resume file is chosen, upload via multipart /upload-resume
      if (selectedResumeFile) {
        const formData = new FormData();
        formData.append("resume", selectedResumeFile);
        formData.append("fullName", fullName.trim());
        formData.append("fullname", fullName.trim());
        formData.append("role", role.trim());
        formData.append("email", email.trim());
        formData.append("phone", phone.trim());
        formData.append("skills", JSON.stringify(skills));
        formData.append("links", JSON.stringify(links));

        const res = await fetch(`${apiUrl}/api/v1/user/upload-resume`, {
          method: "POST",
          body: formData,
        });

        const resData = await res.json();
        if (!res.ok || resData.success !== true) {
          throw new Error(
            resData?.message || "Failed to upload resume to Cloudinary",
          );
        }

        updatedResumeUrl =
          resData?.data?.resumeUrl || resData?.resumeUrl || resumeUrl;
        updatedResumeFileName =
          resData?.data?.resumeFileName ||
          resData?.fileName ||
          selectedResumeFile.name;
        setSelectedResumeFile(null);
      } else {
        // Update user profile via PUT /api/v1/user/profile
        const updatePayload = {
          fullName: fullName.trim(),
          fullname: fullName.trim(),
          role: role.trim(),
          email: email.trim(),
          phone: phone.trim(),
          skills,
          links,
          resume: {
            path: resumeUrl,
            fileName: resumeFileName,
          },
        };

        const res = await fetch(`${apiUrl}/api/v1/user/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        const resData = await res.json();
        if (!res.ok || resData.success !== true) {
          throw new Error(
            resData?.message || "Failed to update profile details on backend",
          );
        }
      }

      // If schedule option changed, sync schedule endpoint too
      if (intervalMinutes !== savedIntervalMinutes) {
        await fetch(`${apiUrl}/api/v1/job/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intervalMinutes }),
        });
        setSavedIntervalMinutes(intervalMinutes);
      }

      setResumeUrl(updatedResumeUrl);
      setResumeFileName(updatedResumeFileName);

      // Update baseline state so isDirty resets
      const newSavedData: SavedProfileState = {
        fullName: fullName.trim(),
        role: role.trim(),
        skills,
        email: email.trim(),
        phone: phone.trim(),
        links,
        resumeUrl: updatedResumeUrl,
        resumeFileName: updatedResumeFileName,
      };
      setSavedData(newSavedData);

      // Sync Zustand State
      const updatedProfile: CandidateProfile = {
        fullName: fullName.trim(),
        role: role.trim(),
        skills,
        email: email.trim(),
        phone: phone.trim(),
        links,
        resumeUrl: updatedResumeUrl,
        resumeFileName: updatedResumeFileName,
        searchKeywords: [role.trim(), ...skills.slice(0, 3)].filter(Boolean),
      };

      setProfile(updatedProfile);
      setIsEditing(false);
      notifySuccess("Profile and preferences saved successfully!");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update profile data";
      notifyError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Immediate Scraping Trigger
  const handleTriggerScrapeNow = async () => {
    if (isScrapingNow) return;
    setIsScrapingNow(true);
    notifyInfo("Triggering immediate job portal scrape...");
    try {
      const res = await fetch(`${apiUrl}/api/v1/job/trigger-now`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to trigger instant scrape");
      }
      notifySuccess("Scrape triggered successfully! Fleet is active.");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Could not trigger scrape";
      notifyError(msg);
    } finally {
      setIsScrapingNow(false);
    }
  };

  // Filtered Roles for Dropdown
  const filteredRoles = roleSearchTerm.trim()
    ? FALLBACK_IT_ROLES.filter((r) =>
        r.toLowerCase().includes(roleSearchTerm.trim().toLowerCase()),
      )
    : FALLBACK_IT_ROLES;

  const canSave = isEditing && isDirty && !isSaving;

  return (
    <div className="space-y-8 px-1 sm:px-4 md:px-8 mx-0 max-w-5xl mx-auto pb-24">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="app-heading-page flex items-center gap-2.5">
              <FiUser className="text-zinc-400" />
              <span>General Settings &amp; Profile</span>
            </h1>
            {isLoadingBackend && (
              <span className="app-caption text-zinc-500 flex items-center gap-1.5 font-mono text-xs">
                <FiRefreshCw className="animate-spin text-zinc-400" size={12} />
                Syncing...
              </span>
            )}
          </div>
          <p className="app-sub text-zinc-400 mt-1">
            Manage your personal profile, credentials, automated job scraping,
            and system preferences.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="h-9 px-3.5 rounded bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-white/10 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <FiArrowLeft size={13} />
          <span>Dashboard</span>
        </button>
      </div>

      {/* Editing Mode Banner */}
      {isEditing && (
        <div className="flex items-center justify-between p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-xs">
          <div className="flex items-center gap-2 text-emerald-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Editing Mode Active</span>
            <span className="text-zinc-400 font-normal">
              — Modify fields, resume, skills, or scraping interval below. Save
              at the bottom.
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isDirty ? (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[11px]">
                ● Unsaved Changes
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[11px]">
                No changes yet
              </span>
            )}
          </div>
        </div>
      )}

      {/* Identity Overview Card */}
      <div className="glass-panel p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-white/15 flex items-center justify-center text-lg font-bold text-zinc-100 shadow-inner shrink-0">
            {fullName
              ? fullName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
              : "U"}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="app-card-title text-zinc-100">
                {fullName || "Candidate"}
              </h3>
              <span className="app-caption px-2 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-800/50 text-emerald-400 text-[10px] font-medium">
                Profile Active
              </span>
            </div>
            <p className="app-sub text-zinc-400">
              {role || "Target role not specified"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
          <span className="px-2.5 py-1 rounded bg-zinc-900 border border-white/5">
            {skills.length} skills tracked
          </span>
          <span className="px-2.5 py-1 rounded bg-zinc-900 border border-white/5">
            {links.length} links connected
          </span>
        </div>
      </div>

      {/* SECTION 1: Personal & Job Targeting Details */}
      <div className="glass-panel p-5 sm:p-6 space-y-5">
        <div className="pb-2 border-b border-white/5">
          <h2 className="app-card-title text-zinc-100 flex items-center gap-2">
            <FiUser className="text-zinc-400" />
            <span>Personal &amp; Job Targeting Details</span>
          </h2>
          <p className="app-sub text-zinc-500 mt-0.5">
            Stored in database and used for automated job scraping and
            evaluation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="block app-label text-zinc-200">Full Name *</label>
            <div className="relative">
              <input
                type="text"
                disabled={!isEditing}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Arjun Sharma"
                className="w-full h-10 px-3.5 app-input rounded glass-input placeholder-zinc-500 transition-all border border-white/10 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-zinc-950/40"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                <FiUser size={14} />
              </div>
            </div>
          </div>

          {/* Target Role Dropdown */}
          <div className="space-y-2 relative" ref={roleDropdownRef}>
            <label className="block app-label text-zinc-200">
              Target Role / Job Title *
            </label>
            <div className="relative">
              <input
                type="text"
                disabled={!isEditing}
                value={roleSearchTerm}
                onChange={(e) => {
                  if (!isEditing) return;
                  setRoleSearchTerm(e.target.value);
                  setRole(e.target.value);
                  setIsRoleDropdownOpen(true);
                }}
                onFocus={() => {
                  if (isEditing) setIsRoleDropdownOpen(true);
                }}
                placeholder="e.g. Frontend Developer, DevOps..."
                className="w-full h-10 px-3.5 pr-10 app-input rounded glass-input placeholder-zinc-500 transition-all border border-white/10 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-zinc-950/40"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                <FiSearch size={14} />
              </div>
            </div>

            {isEditing && isRoleDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded bg-zinc-900 border border-white/10 shadow-2xl divide-y divide-white/[0.04]">
                {filteredRoles.slice(0, 20).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onMouseDown={() => {
                      setRole(r);
                      setRoleSearchTerm(r);
                      setIsRoleDropdownOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{r}</span>
                    {r.toLowerCase() === role.toLowerCase() && (
                      <FiCheck
                        className="text-emerald-400 shrink-0"
                        size={13}
                      />
                    )}
                  </button>
                ))}
                {filteredRoles.length === 0 && (
                  <div className="px-3.5 py-2 text-xs text-zinc-400 italic">
                    Custom role:{" "}
                    <strong className="text-zinc-200">
                      "{roleSearchTerm}"
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email Address */}
          <div className="space-y-2">
            <label className="block app-label text-zinc-200">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                disabled={!isEditing}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@example.com"
                className="w-full h-10 px-3.5 app-input rounded glass-input placeholder-zinc-500 transition-all border border-white/10 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-zinc-950/40"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                <FiMail size={14} />
              </div>
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <label className="block app-label text-zinc-200">
              Phone Number
            </label>
            <div className="relative">
              <input
                type="tel"
                disabled={!isEditing}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full h-10 px-3.5 app-input rounded glass-input placeholder-zinc-500 transition-all border border-white/10 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-zinc-950/40"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                <FiPhone size={14} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="glass-panel p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div>
            <h2 className="app-card-title text-zinc-100 flex items-center gap-2">
              <FiClock className="text-emerald-400" />
              <span>Automated Scraping Schedule</span>
            </h2>
            <p className="app-sub text-zinc-400 mt-1">
              Configure background job scraping frequency. Selecting an interval
              updates option and can be saved to backend.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="app-caption px-2.5 py-1 rounded bg-zinc-900 border border-white/10 font-mono text-zinc-300">
              Current: Every{" "}
              {intervalMinutes === 60 ? "1 hr" : `${intervalMinutes}m`}
            </span>
            <span
              className={`app-caption px-2.5 py-1 rounded border font-medium ${
                isScheduleRunning
                  ? "bg-amber-950/40 border-amber-800/40 text-amber-400"
                  : "bg-emerald-950/40 border-emerald-800/40 text-emerald-400"
              }`}
            >
              {isScheduleRunning ? "Dispatching..." : "Active"}
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
                disabled={isSaving}
                onClick={() => {
                  if (!isEditing) {
                    setIsEditing(true);
                  }
                  setIntervalMinutes(opt.value);
                }}
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

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/5">
          <div className="text-xs text-zinc-400">
            Want to run an ad-hoc scraping cycle right now?
          </div>
          <button
            type="button"
            onClick={handleTriggerScrapeNow}
            disabled={isScrapingNow}
            className="px-4 py-2 rounded bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40 text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
          >
            <FiRefreshCw
              className={isScrapingNow ? "animate-spin" : ""}
              size={13}
            />
            <span>
              {isScrapingNow ? "Scraping Portals..." : "Trigger Scrape Now"}
            </span>
          </button>
        </div>
      </div>

      {/* SECTION 6: System & Appearance Preferences */}
      <div className="glass-panel p-5 sm:p-6 space-y-5">
        <h2 className="app-card-title text-zinc-100 flex items-center gap-2">
          <FiSliders className="text-zinc-400" />
          <span>Layout &amp; Appearance Preferences</span>
        </h2>

        <div className="flex items-center justify-between p-4 rounded bg-zinc-900/60 border border-white/5">
          <div className="space-y-0.5">
            <span className="app-label text-zinc-200">
              Navigation Dock Behavior
            </span>
            <p className="app-caption text-zinc-400">
              Bottom-docked Apple macOS style with spring interactive scaling
            </p>
          </div>
          <span className="app-caption text-zinc-400 flex items-center gap-1.5">
            <FiCheck className="text-emerald-400" />
            Active
          </span>
        </div>

        <div className="flex items-center justify-between p-4 rounded bg-zinc-900/60 border border-white/5">
          <div className="space-y-0.5">
            <span className="app-label text-zinc-200">System Theme</span>
            <p className="app-caption text-zinc-400">
              Clean semi-transparent dark obsidian with neutral slate accents
            </p>
          </div>
          <span className="app-caption text-zinc-400 flex items-center gap-1.5">
            <FiCheck className="text-emerald-400" />
            Active
          </span>
        </div>

        <div className="flex items-center justify-between p-4 rounded bg-zinc-900/60 border border-white/5">
          <div className="space-y-0.5">
            <span className="app-label text-zinc-200">
              Real-time Notifications
            </span>
            <p className="app-caption text-zinc-400">
              Toast popups for scraping sessions, AI analysis, and error alerts
            </p>
          </div>
          <span className="app-caption text-zinc-400 flex items-center gap-1.5">
            <FiCheck className="text-emerald-400" />
            Enabled
          </span>
        </div>
      </div>

      {/* BOTTOM ACTION BAR: Edit, Cancel, & Save Changes in ONE place */}
      <div className="flex items-center justify-end gap-3 self-end sm:self-auto">
        {/* Edit / Cancel Button */}
        {!isEditing ? (
          <button
            type="button"
            onClick={handleStartEditing}
            className="h-10 px-4 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/15 text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.99]"
          >
            <FiEdit3 size={13} className="text-emerald-400" />
            <span>Edit Profile</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="h-10 px-4 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <FiX size={13} />
            <span>Cancel</span>
          </button>
        )}

        {/* Save Changes Button (Only enabled when isEditing && isDirty) */}
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={!canSave}
          title={
            !isEditing
              ? "Click 'Edit Profile' to make changes"
              : !isDirty
                ? "No changes made yet"
                : "Save your changes to backend"
          }
          className={`h-10 px-5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 ${
            canSave
              ? "bg-emerald-400 hover:bg-emerald-300 text-zinc-950 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
              : "bg-zinc-800/80 text-zinc-500 border border-white/5 cursor-not-allowed opacity-50 shadow-none"
          }`}
        >
          {isSaving ? (
            <>
              <FiLoader size={13} className="animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <FiSave size={13} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
