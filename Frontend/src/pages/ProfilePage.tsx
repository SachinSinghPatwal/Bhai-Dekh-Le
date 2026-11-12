import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  FiUser,
  FiFileText,
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
  FiLoader,
  FiEdit3,
  FiX,
} from "react-icons/fi";
import { FaGithub, FaLinkedin } from "react-icons/fa6";
import { useCandidateStore } from "../store/useCandidateStore";
import { notifySuccess, notifyError, notifyInfo } from "../utils/toast";
import { parseResumeFile } from "../utils/resumeParser";
import { getApiUrl } from "../lib/api";
import { FALLBACK_IT_ROLES, POPULAR_SKILLS } from "../lib/candidateOptions";
import type { CandidateProfile } from "../types/candidate";

interface ProfileSnapshot {
  fullName: string;
  role: string;
  email: string;
  phone: string;
  links: string[];
  skills: string[];
  resumeUrl: string;
  resumeFileName: string;
}

const buildSnapshot = (profile: CandidateProfile | null): ProfileSnapshot => ({
  fullName: profile?.fullName || "",
  role: profile?.role || "",
  email: profile?.email || "",
  phone: profile?.phone || "",
  links: profile?.links || [],
  skills: profile?.skills || [],
  resumeUrl: profile?.resumeUrl || "",
  resumeFileName: profile?.resumeFileName || "",
});

export const ProfilePage: React.FC = () => {
  const { profile, setProfile, hydrateFromBackend } = useCandidateStore();
  const apiUrl = getApiUrl();

  const savedSnapshot = useMemo(() => buildSnapshot(profile), [profile]);
  const [draft, setDraft] = useState<ProfileSnapshot | null>(null);
  const [selectedResumeFile, setSelectedResumeFile] = useState<File | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isExtractingResume, setIsExtractingResume] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [newLinkInput, setNewLinkInput] = useState("");
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  const isEditing = draft !== null;
  const current = draft ?? savedSnapshot;

  useEffect(() => {
    void hydrateFromBackend();
  }, [hydrateFromBackend]);

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

  const isDirty = useMemo(() => {
    if (!draft) return false;
    if (selectedResumeFile !== null) return true;
    if (draft.fullName.trim() !== savedSnapshot.fullName.trim()) return true;
    if (draft.role.trim() !== savedSnapshot.role.trim()) return true;
    if (draft.email.trim() !== savedSnapshot.email.trim()) return true;
    if (draft.phone.trim() !== savedSnapshot.phone.trim()) return true;
    if (draft.resumeUrl !== savedSnapshot.resumeUrl) return true;
    if (draft.resumeFileName !== savedSnapshot.resumeFileName) return true;
    if (draft.links.length !== savedSnapshot.links.length) return true;
    if (draft.links.some((l, i) => l !== savedSnapshot.links[i])) return true;
    if (draft.skills.length !== savedSnapshot.skills.length) return true;
    if (draft.skills.some((s, i) => s !== savedSnapshot.skills[i])) return true;
    return false;
  }, [draft, savedSnapshot, selectedResumeFile]);

  const updateDraft = (patch: Partial<ProfileSnapshot>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const addSkill = (skillToAdd: string) => {
    if (!draft) return;
    const clean = skillToAdd.trim();
    if (!clean) return;
    if (draft.skills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      notifyInfo(`"${clean}" is already added.`);
      return;
    }
    updateDraft({ skills: [...draft.skills, clean] });
    setNewSkillInput("");
  };

  const addLink = (linkToAdd: string) => {
    if (!draft) return;
    let clean = linkToAdd.trim().replace(/[.,;:)>\]]+$/, "");
    if (!clean) return;
    if (!/^https?:\/\//i.test(clean)) {
      clean = `https://${clean.replace(/^\/+/, "")}`;
    }
    if (draft.links.includes(clean)) {
      notifyInfo("Link is already added.");
      return;
    }
    updateDraft({ links: [...draft.links, clean] });
    setNewLinkInput("");
  };

  const handleResumeSelection = async (file: File) => {
    if (!draft) return;
    setSelectedResumeFile(file);
    updateDraft({ resumeFileName: file.name });
    setIsExtractingResume(true);

    try {
      const parsed = await parseResumeFile(file);
      setDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          skills:
            parsed.skills.length > 0
              ? Array.from(new Set([...prev.skills, ...parsed.skills]))
              : prev.skills,
          email: !prev.email && parsed.email ? parsed.email : prev.email,
          phone: !prev.phone && parsed.phone ? parsed.phone : prev.phone,
          links:
            parsed.links && parsed.links.length > 0
              ? Array.from(new Set([...prev.links, ...parsed.links]))
              : prev.links,
        };
      });
      notifySuccess(
        `Parsed "${file.name}" (${parsed.skills.length} skills extracted).`,
      );
    } catch {
      notifyInfo("Resume attached. You can adjust skills manually.");
    } finally {
      setIsExtractingResume(false);
    }
  };

  const handleCancelEdit = () => {
    setDraft(null);
    setSelectedResumeFile(null);
    setNewSkillInput("");
    setNewLinkInput("");
  };

  const handleSaveProfile = async () => {
    if (!draft || !isDirty) return;

    if (!draft.fullName.trim()) {
      notifyError("Full Name is required.");
      return;
    }
    if (!draft.role.trim()) {
      notifyError("Target Role is required.");
      return;
    }
    if (draft.skills.length === 0) {
      notifyError("Add at least one technical skill.");
      return;
    }

    setIsSaving(true);
    try {
      let updatedResumeUrl = draft.resumeUrl;
      let updatedResumeFileName = draft.resumeFileName;

      if (selectedResumeFile) {
        const formData = new FormData();
        formData.append("resume", selectedResumeFile);
        formData.append("fullName", draft.fullName.trim());
        formData.append("fullname", draft.fullName.trim());
        formData.append("role", draft.role.trim());
        formData.append("email", draft.email.trim());
        formData.append("phone", draft.phone.trim());
        formData.append("skills", JSON.stringify(draft.skills));
        formData.append("links", JSON.stringify(draft.links));

        const res = await fetch(`${apiUrl}/api/v1/user/upload-resume`, {
          method: "POST",
          body: formData,
        });
        const resData = await res.json();
        if (!res.ok || resData.success !== true) {
          throw new Error(resData?.message || "Failed to upload resume");
        }

        updatedResumeUrl =
          resData?.data?.resumeUrl || resData?.resumeUrl || draft.resumeUrl;
        updatedResumeFileName =
          resData?.data?.resumeFileName ||
          resData?.fileName ||
          selectedResumeFile.name;
      } else {
        const res = await fetch(`${apiUrl}/api/v1/user/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: draft.fullName.trim(),
            fullname: draft.fullName.trim(),
            role: draft.role.trim(),
            email: draft.email.trim(),
            phone: draft.phone.trim(),
            skills: draft.skills,
            links: draft.links,
            resume: {
              path: draft.resumeUrl,
              fileName: draft.resumeFileName,
            },
          }),
        });
        const resData = await res.json();
        if (!res.ok || resData.success !== true) {
          throw new Error(resData?.message || "Failed to update profile");
        }
      }

      const updatedProfile: CandidateProfile = {
        fullName: draft.fullName.trim(),
        role: draft.role.trim(),
        skills: draft.skills,
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        links: draft.links,
        resumeUrl: updatedResumeUrl,
        resumeFileName: updatedResumeFileName,
        searchKeywords: [
          draft.role.trim(),
          ...draft.skills.slice(0, 3),
        ].filter(Boolean),
      };

      setProfile(updatedProfile);
      setSelectedResumeFile(null);
      setDraft(null);
      notifySuccess("Profile updated.");
    } catch (err: unknown) {
      notifyError(
        err instanceof Error ? err.message : "Failed to update profile",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRoles = current.role.trim()
    ? FALLBACK_IT_ROLES.filter((r) =>
        r.toLowerCase().includes(current.role.trim().toLowerCase()),
      )
    : FALLBACK_IT_ROLES;

  const canSave = isEditing && isDirty && !isSaving;

  return (
    <div className="space-y-6 px-1 sm:px-4 md:px-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="app-heading-page flex items-center gap-2.5">
            <FiUser className="text-zinc-400" />
            <span>Profile &amp; Resume</span>
          </h1>
          <p className="app-sub text-zinc-400 mt-1">
            Candidate details, technical skills, and resume used for AI job
            matching
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setDraft({ ...savedSnapshot })}
              className="h-9 px-3.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/15 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FiEdit3 size={13} className="text-emerald-400" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="h-9 px-3.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <FiX size={13} />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={() => void handleSaveProfile()}
                disabled={!canSave}
                className={`h-9 px-4 rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                  canSave
                    ? "bg-emerald-400 hover:bg-emerald-300 text-zinc-950 cursor-pointer"
                    : "bg-zinc-800/80 text-zinc-500 border border-white/5 cursor-not-allowed opacity-60"
                }`}
              >
                {isSaving ? (
                  <>
                    <FiLoader size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FiSave size={13} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="glass-panel p-5 sm:p-6 space-y-5">
        <h2 className="app-card-title text-zinc-100 flex items-center gap-2 pb-2 border-b border-white/5">
          <FiUser className="text-zinc-400" />
          <span>Personal &amp; Target Role</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block app-label text-zinc-200">Full Name *</label>
            <input
              type="text"
              disabled={!isEditing}
              value={current.fullName}
              onChange={(e) => updateDraft({ fullName: e.target.value })}
              placeholder="e.g. Arjun Sharma"
              className="w-full h-10 px-3.5 app-input rounded glass-input placeholder-zinc-500 border border-white/10 disabled:opacity-75 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5 relative" ref={roleDropdownRef}>
            <label className="block app-label text-zinc-200">
              Target Role *
            </label>
            <div className="relative">
              <input
                type="text"
                disabled={!isEditing}
                value={current.role}
                onChange={(e) => {
                  updateDraft({ role: e.target.value });
                  setIsRoleDropdownOpen(true);
                }}
                onFocus={() => {
                  if (isEditing) setIsRoleDropdownOpen(true);
                }}
                placeholder="e.g. Full Stack Developer"
                className="w-full h-10 px-3.5 pr-9 app-input rounded glass-input placeholder-zinc-500 border border-white/10 disabled:opacity-75 disabled:cursor-not-allowed"
              />
              <FiSearch
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              />
            </div>

            {isEditing && isRoleDropdownOpen && filteredRoles.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded bg-zinc-900 border border-white/10 shadow-2xl divide-y divide-white/[0.04]">
                {filteredRoles.slice(0, 15).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onMouseDown={() => {
                      updateDraft({ role: r });
                      setIsRoleDropdownOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center justify-between cursor-pointer"
                  >
                    <span>{r}</span>
                    {r.toLowerCase() === current.role.toLowerCase() && (
                      <FiCheck className="text-emerald-400" size={13} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block app-label text-zinc-200">Email</label>
            <div className="relative">
              <input
                type="email"
                disabled={!isEditing}
                value={current.email}
                onChange={(e) => updateDraft({ email: e.target.value })}
                placeholder="candidate@example.com"
                className="w-full h-10 px-3.5 pr-9 app-input rounded glass-input placeholder-zinc-500 border border-white/10 disabled:opacity-75 disabled:cursor-not-allowed"
              />
              <FiMail
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block app-label text-zinc-200">Phone</label>
            <div className="relative">
              <input
                type="tel"
                disabled={!isEditing}
                value={current.phone}
                onChange={(e) => updateDraft({ phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full h-10 px-3.5 pr-9 app-input rounded glass-input placeholder-zinc-500 border border-white/10 disabled:opacity-75 disabled:cursor-not-allowed"
              />
              <FiPhone
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h2 className="app-card-title text-zinc-100 flex items-center gap-2">
            <FiCheck className="text-emerald-400" />
            <span>Technical Skills ({current.skills.length})</span>
          </h2>
        </div>

        {isEditing && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addSkill(newSkillInput);
                  }
                }}
                placeholder="Add skill (press Enter or comma)"
                className="flex-1 h-9 px-3.5 app-input rounded glass-input placeholder-zinc-500 border border-white/10"
              />
              <button
                type="button"
                onClick={() => addSkill(newSkillInput)}
                className="h-9 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium cursor-pointer flex items-center gap-1.5"
              >
                <FiPlus size={13} />
                <span>Add</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SKILLS.filter(
                (s) =>
                  !current.skills.some(
                    (existing) => existing.toLowerCase() === s.toLowerCase(),
                  ),
              )
                .slice(0, 8)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSkill(s)}
                    className="px-2.5 py-1 rounded bg-zinc-900/60 hover:bg-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 border border-white/5 cursor-pointer"
                  >
                    + {s}
                  </button>
                ))}
            </div>
          </div>
        )}

        {current.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {current.skills.map((skill) => (
              <span
                key={skill}
                className="h-8 pl-3 pr-2 rounded text-xs font-medium inline-flex items-center gap-1.5 bg-zinc-800/90 text-zinc-200 border border-white/10"
              >
                <span>{skill}</span>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft({
                        skills: current.skills.filter((s) => s !== skill),
                      })
                    }
                    className="text-zinc-400 hover:text-red-400 cursor-pointer p-0.5"
                    title={`Remove ${skill}`}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">No skills configured yet.</p>
        )}
      </div>

      <div className="glass-panel p-5 sm:p-6 space-y-4">
        <h2 className="app-card-title text-zinc-100 flex items-center gap-2 pb-2 border-b border-white/5">
          <FiFileText className="text-emerald-400" />
          <span>Resume</span>
        </h2>

        {(current.resumeFileName || current.resumeUrl) && (
          <div className="p-3.5 rounded bg-zinc-900/70 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <FiFileText size={16} />
              </div>
              <span className="text-xs font-medium text-zinc-200 truncate">
                {current.resumeFileName || "Candidate Resume.pdf"}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {current.resumeUrl && (
                <a
                  href={current.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-white/10 inline-flex items-center gap-1.5"
                >
                  <FiExternalLink size={12} />
                  <span>View</span>
                </a>
              )}
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    updateDraft({ resumeUrl: "", resumeFileName: "" });
                    setSelectedResumeFile(null);
                  }}
                  className="px-3 py-1.5 rounded bg-red-950/30 hover:bg-red-900/40 text-red-300 text-xs font-medium border border-red-900/40 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FiTrash2 size={12} />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        )}

        {isEditing && (
          <label
            className={`flex items-center justify-center gap-2.5 h-24 w-full rounded-lg border border-dashed transition-all cursor-pointer ${
              selectedResumeFile
                ? "border-emerald-500/50 bg-emerald-500/10"
                : "border-zinc-700/60 bg-zinc-900/30 hover:border-zinc-500/60"
            }`}
          >
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleResumeSelection(file);
              }}
            />
            {isExtractingResume ? (
              <span className="text-xs text-zinc-300 flex items-center gap-2">
                <FiLoader size={16} className="animate-spin" />
                Scanning resume...
              </span>
            ) : selectedResumeFile ? (
              <span className="text-xs text-emerald-300 font-medium truncate max-w-xs">
                {selectedResumeFile.name} (ready to upload on save)
              </span>
            ) : (
              <span className="text-xs text-zinc-400 flex items-center gap-2">
                <FiUpload size={15} />
                Upload replacement resume (.pdf, .docx, .txt)
              </span>
            )}
          </label>
        )}
      </div>

      <div className="glass-panel p-5 sm:p-6 space-y-4">
        <h2 className="app-card-title text-zinc-100 flex items-center gap-2 pb-2 border-b border-white/5">
          <FiGlobe className="text-zinc-400" />
          <span>Links ({current.links.length})</span>
        </h2>

        {isEditing && (
          <div className="flex gap-2">
            <input
              type="url"
              value={newLinkInput}
              onChange={(e) => setNewLinkInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLink(newLinkInput);
                }
              }}
              placeholder="https://github.com/..."
              className="flex-1 h-9 px-3.5 app-input rounded glass-input placeholder-zinc-500 border border-white/10"
            />
            <button
              type="button"
              onClick={() => addLink(newLinkInput)}
              className="h-9 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium cursor-pointer flex items-center gap-1.5"
            >
              <FiPlus size={13} />
              <span>Add</span>
            </button>
          </div>
        )}

        {current.links.length > 0 ? (
          <div className="space-y-2">
            {current.links.map((link) => {
              const isGithub = link.includes("github.com");
              const isLinkedin = link.includes("linkedin.com");
              return (
                <div
                  key={link}
                  className="flex items-center justify-between p-2.5 rounded bg-zinc-900/60 border border-white/5 text-xs"
                >
                  <div className="flex items-center gap-2.5 truncate mr-3">
                    {isGithub ? (
                      <FaGithub className="text-zinc-300 shrink-0" size={14} />
                    ) : isLinkedin ? (
                      <FaLinkedin
                        className="text-blue-400 shrink-0"
                        size={14}
                      />
                    ) : (
                      <FiGlobe className="text-zinc-400 shrink-0" size={14} />
                    )}
                    <span className="font-mono text-zinc-200 truncate">
                      {link}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-zinc-400 hover:text-zinc-200"
                      title="Open link"
                    >
                      <FiExternalLink size={13} />
                    </a>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft({
                            links: current.links.filter((l) => l !== link),
                          })
                        }
                        className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer"
                        title="Remove link"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">No links attached.</p>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
