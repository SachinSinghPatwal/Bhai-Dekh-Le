import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  candidateSchema,
  type CandidateFormValues,
} from "../../schema/candidateSchema";
import { useCandidateStore } from "../../store/useCandidateStore";
import { notifyError, notifySuccess, notifyInfo } from "../../utils/toast";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiSearch,
  FiUpload,
  FiX,
  FiCheck,
  FiLoader,
  FiPlus,
} from "react-icons/fi";
import { parseResumeFile } from "../../utils/resumeParser";

const INPUT_CLASS =
  "w-full h-10 px-3.5 app-input rounded glass-input placeholder-zinc-500 transition-all";
const LABEL_CLASS = "block app-label";

const FALLBACK_IT_ROLES = [
  "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "React Developer", "Angular Developer", "Vue.js Developer",
  "Node.js Developer", "Python Developer", "Java Developer",
  "DevOps Engineer", "Cloud Engineer", "AWS Solutions Architect",
  "Azure Developer", "Data Scientist", "Data Analyst",
  "Machine Learning Engineer", "AI Engineer", "Mobile Developer",
  "Android Developer", "iOS Developer", "React Native Developer",
  "Flutter Developer", "QA Engineer", "Test Automation Engineer",
  "Site Reliability Engineer (SRE)", "Database Administrator",
  "UI/UX Designer", "Product Manager", "Scrum Master",
  "Technical Lead", "Software Architect", "Security Engineer",
  "Penetration Tester", "Blockchain Developer",
  "Embedded Systems Engineer", "Game Developer", "Unity Developer",
  "Data Engineer", "ETL Developer", "Business Intelligence Developer",
  "SAP Consultant", "Salesforce Developer", "Shopify Developer",
  "WordPress Developer", "TypeScript Developer", "Go Developer",
  "Rust Developer", "C++ Developer", "Kotlin Developer",
  "Spring Boot Developer", ".NET Developer", "PHP Developer",
  "Laravel Developer", "Ruby on Rails Developer", "GraphQL Developer",
  "Microservices Developer", "Systems Programmer", "Network Engineer",
  "IT Support Engineer", "Cybersecurity Analyst",
];

const POPULAR_SKILLS = [
  "React", "Node.js", "TypeScript", "JavaScript", "Python",
  "Tailwind CSS", "Next.js", "MongoDB", "PostgreSQL", "Docker",
  "AWS", "Redux", "Zustand", "REST API", "Git",
];

const SLIDE_STEPS = [
  { id: 0, title: "Personal Info" },
  { id: 1, title: "Resume & Skills" },
];

interface TagChipProps {
  tag: string;
  onRemove?: () => void;
}

const TagChip: React.FC<TagChipProps> = ({ tag, onRemove }) => (
  <span className="h-8 pl-3 pr-2 rounded text-xs font-medium inline-flex items-center gap-1.5 bg-zinc-800/90 text-zinc-200 border border-white/10 group hover:border-white/20 transition-colors">
    <span>{tag}</span>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="text-zinc-400 hover:text-red-400 cursor-pointer transition-colors leading-none p-0.5"
        title={`Remove ${tag}`}
      >
        <FiX size={11} />
      </button>
    )}
  </span>
);

interface RoleSearchDropdownProps {
  value: string;
  onChange: (val: string) => void;
  error?: string;
}

const RoleSearchDropdown: React.FC<RoleSearchDropdownProps> = ({
  value,
  onChange,
  error,
}) => {
  const [searchTerm, setSearchTerm] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [roles, setRoles] = useState<string[]>(FALLBACK_IT_ROLES);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    let isMounted = true;
    const fetchOnlineRoles = async () => {
      try {
        const res = await fetch(
          "https://raw.githubusercontent.com/datasets/employment-occupations/master/data/occupations.csv",
          { signal: AbortSignal.timeout(3000) }
        );
        if (!res.ok) return;
        const text = await res.text();
        const parsed = text
          .split("\n")
          .map((line) => line.split(",")[0]?.replace(/"/g, "").trim())
          .filter(
            (r) =>
              r &&
              /developer|engineer|architect|designer|analyst|programmer|devops|data|cloud|qa|security/i.test(
                r
              )
          );
        if (isMounted && parsed.length > 10) {
          const merged = [...new Set([...parsed, ...FALLBACK_IT_ROLES])].sort();
          setRoles(merged);
        }
      } catch {
        // Fallback remains active
      }
    };
    fetchOnlineRoles();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredRoles = searchTerm.trim()
    ? roles.filter((r) =>
        r.toLowerCase().includes(searchTerm.trim().toLowerCase())
      )
    : roles;

  const handleSelect = (selectedRole: string) => {
    setSearchTerm(selectedRole);
    onChange(selectedRole);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setSearchTerm(next);
    onChange(next);
    setIsOpen(true);
  };

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      <div className="flex items-center justify-between gap-2">
        <label className={LABEL_CLASS}>Target Role / Job Title *</label>
        {error && (
          <span className="text-xs text-red-400 font-normal truncate">
            {error}
          </span>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="e.g. Frontend Developer, DevOps Engineer..."
          className={`${INPUT_CLASS} pr-10`}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
          <FiSearch size={14} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded bg-zinc-900 border border-white/10 shadow-2xl divide-y divide-white/[0.04] scrollbar-thin">
          {filteredRoles.slice(0, 30).map((r) => (
            <button
              key={r}
              type="button"
              onMouseDown={() => handleSelect(r)}
              className="w-full px-3.5 py-2.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>{r}</span>
              {r.toLowerCase() === value.toLowerCase() && (
                <FiCheck className="text-emerald-400 shrink-0" size={13} />
              )}
            </button>
          ))}
          {filteredRoles.length === 0 && (
            <div className="px-3.5 py-2 text-xs text-zinc-400 italic">
              Use custom role: <strong className="text-zinc-200">"{searchTerm}"</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export interface CandidateDetailsFormProps {
  onCompleted: () => void;
}

export const CandidateDetailsForm: React.FC<CandidateDetailsFormProps> = ({
  onCompleted,
}) => {
  const navigate = useNavigate();
  const { profile, setProfile } = useCandidateStore();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [attemptedSteps, setAttemptedSteps] = useState<Record<number, boolean>>({});
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(
    profile?.resumeFileName || null
  );
  const [isExtractingSkills, setIsExtractingSkills] = useState(false);
  const [manualSkillInput, setManualSkillInput] = useState("");

  const {
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      fullName: profile?.fullName || "",
      role: profile?.role || "",
      skills: profile?.skills || [],
      resumeFileName: profile?.resumeFileName || "",
    },
  });

  const formValues = watch();
  const skillsList = watch("skills") || [];
  const currentRole = watch("role") || "";

  const isStep0Complete = (vals: Partial<CandidateFormValues>) =>
    (vals.fullName?.trim() || "").length >= 2 && (vals.role?.trim() || "").length >= 2;
  const isStep1Complete = (vals: Partial<CandidateFormValues>) =>
    (vals.skills || []).length >= 1;

  const step0Valid = isStep0Complete(formValues);
  const step1Valid = isStep1Complete(formValues);
  const isAllValid = step0Valid && step1Valid;

  const stepHasError = (stepId: number) => {
    if (stepId === 0)
      return Boolean(errors.fullName || errors.role) || Boolean(attemptedSteps[0] && !step0Valid);
    if (stepId === 1)
      return Boolean(errors.skills) || Boolean(attemptedSteps[1] && !step1Valid);
    return false;
  };

  const stepIsComplete = (stepId: number) => {
    if (stepId === 0) return step0Valid;
    if (stepId === 1) return step1Valid;
    return false;
  };

  const addSkill = (skill: string) => {
    const clean = skill.trim();
    if (!clean || skillsList.some((s) => s.toLowerCase() === clean.toLowerCase())) return;
    setValue("skills", [...skillsList, clean], { shouldValidate: true });
  };

  const removeSkill = (skill: string) => {
    setValue(
      "skills",
      skillsList.filter((s) => s !== skill),
      { shouldValidate: true }
    );
  };

  const handleManualSkillCommit = (e?: React.KeyboardEvent) => {
    if (e && e.key !== "Enter" && e.key !== ",") return;
    if (e) e.preventDefault();
    addSkill(manualSkillInput);
    setManualSkillInput("");
  };

  const handleResumeUpload = async (file: File) => {
    setUploadedFileName(file.name);
    setValue("resumeFileName", file.name, { shouldValidate: true });
    setIsExtractingSkills(true);
    notifyInfo("Scanning your resume for technical skills...");

    try {
      const { text, skills } = await parseResumeFile(file);
      if (skills.length > 0) {
        const merged = [...new Set([...skillsList, ...skills])];
        setValue("skills", merged, { shouldValidate: true });
        notifySuccess(
          `Extracted ${skills.length} skill${skills.length > 1 ? "s" : ""} from your resume!`
        );
      } else if (text && text.trim().length > 0) {
        notifyInfo(
          "Resume read successfully. No standard IT skills matched — you can add skills manually below."
        );
      } else {
        notifyInfo(
          `Attached "${file.name}". Please add your core technical skills below.`
        );
      }
    } catch (err) {
      console.warn("Resume parsing notice:", err);
      notifyError("Could not extract skills automatically. Add your skills manually below.");
    } finally {
      setIsExtractingSkills(false);
    }
  };

  const validateStep = async (stepId: number): Promise<boolean> => {
    if (stepId === 0) {
      const valid = await trigger(["fullName", "role"]);
      if (!valid) {
        setAttemptedSteps((p) => ({ ...p, 0: true }));
        notifyError("Please enter your name and target role.");
        return false;
      }
      return true;
    }
    if (stepId === 1) {
      const valid = await trigger(["skills"]);
      if (!valid) {
        setAttemptedSteps((p) => ({ ...p, 1: true }));
        notifyError("Please add at least one skill.");
        return false;
      }
      return true;
    }
    return true;
  };

  const nextSlide = async () => {
    const ok = await validateStep(currentSlide);
    if (!ok) return;
    setCurrentSlide((prev) => Math.min(prev + 1, SLIDE_STEPS.length - 1));
  };

  const prevSlide = () => setCurrentSlide((prev) => Math.max(prev - 1, 0));

  const handleStepClick = async (targetId: number) => {
    if (targetId === currentSlide) return;
    if (targetId < currentSlide) {
      setCurrentSlide(targetId);
      return;
    }
    for (let step = 0; step < targetId; step++) {
      const ok = await validateStep(step);
      if (!ok) {
        setCurrentSlide(step);
        return;
      }
    }
    setCurrentSlide(targetId);
  };

  const onSubmit = (data: CandidateFormValues) => {
    try {
      setProfile({
        fullName: data.fullName,
        role: data.role,
        skills: data.skills,
        resumeFileName: uploadedFileName || undefined,
        searchKeywords: [data.role, ...data.skills.slice(0, 3)],
      });
      notifySuccess("Profile saved! Heading to Dashboard.");
      onCompleted();
    } catch {
      notifyError("Failed to save profile. Please try again.");
    }
  };

  const onError = () => {
    if (errors.fullName || errors.role) {
      setAttemptedSteps((p) => ({ ...p, 0: true }));
      setCurrentSlide(0);
      notifyError("Please enter your name and target role.");
    } else if (errors.skills) {
      setAttemptedSteps((p) => ({ ...p, 1: true }));
      setCurrentSlide(1);
      notifyError("Please add at least one skill.");
    }
  };

  return (
    <div className="max-w-[560px] mx-auto space-y-6 pb-24">
      {profile?.fullName && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <FiArrowLeft className="text-xs" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}

      <div className="text-center space-y-2 pt-2">
        <h1 className="app-heading-page">Set Up Your Profile</h1>
        <p className="app-sub text-zinc-500 max-w-sm mx-auto">
          Enter your name, role, and attach your resume to extract skills.
        </p>
      </div>

      {/* Progress Tabs (2 Steps) */}
      <div
        className="relative grid p-1 rounded bg-zinc-900/60 border border-white/[0.06] overflow-hidden"
        style={{ gridTemplateColumns: `repeat(${SLIDE_STEPS.length}, minmax(0, 1fr))` }}
      >
        <div
          className="absolute top-1 bottom-1 rounded bg-zinc-800 transition-all duration-300 ease-out"
          style={{
            width: `calc((100% - 8px) / ${SLIDE_STEPS.length})`,
            left: `calc(4px + (100% - 8px) * ${currentSlide} / ${SLIDE_STEPS.length})`,
          }}
        />

        {SLIDE_STEPS.map((step) => {
          const isActive = currentSlide === step.id;
          const isDone = stepIsComplete(step.id);
          const isErr = stepHasError(step.id);

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(step.id)}
              className={`relative z-10 flex items-center justify-center gap-2 py-2 text-xs font-medium cursor-pointer transition-colors ${
                isActive
                  ? "text-zinc-100"
                  : isDone
                  ? "text-zinc-400 hover:text-zinc-200"
                  : isErr
                  ? "text-red-400"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold transition-all ${
                  isErr
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : isDone
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : isActive
                    ? "bg-zinc-100 text-zinc-950 font-semibold"
                    : "bg-zinc-800 text-zinc-500 border border-white/5"
                }`}
              >
                {isErr ? "!" : isDone ? "✓" : step.id + 1}
              </span>
              <span className="truncate">{step.title}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
        <div>
          {/* SLIDE 1 — Personal Information */}
          <div className={currentSlide === 0 ? "block slide-content-active space-y-5" : "hidden"}>
            <div className="glass-panel p-5 sm:p-6 space-y-5">
              <div>
                <h2 className="app-card-title">1. Personal Information</h2>
                <p className="app-sub text-zinc-500 mt-1">
                  Tell us who you are and the IT role you are targeting.
                </p>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className={LABEL_CLASS}>Full Name *</label>
                  {errors.fullName && (
                    <span className="text-xs text-red-400 font-normal truncate">
                      {errors.fullName.message}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. Arjun Sharma"
                  className={INPUT_CLASS}
                  defaultValue={profile?.fullName || ""}
                  onChange={(e) =>
                    setValue("fullName", e.target.value, {
                      shouldValidate: !!attemptedSteps[0],
                    })
                  }
                />
              </div>

              {/* Role Dropdown */}
              <RoleSearchDropdown
                value={currentRole}
                onChange={(val) =>
                  setValue("role", val, { shouldValidate: !!attemptedSteps[0] })
                }
                error={errors.role?.message}
              />
            </div>
          </div>

          {/* SLIDE 2 — Resume & Skills */}
          <div className={currentSlide === 1 ? "block slide-content-active space-y-5" : "hidden"}>
            {/* Resume Upload Card */}
            <div className="glass-panel p-5 sm:p-6 space-y-4">
              <div>
                <h2 className="app-card-title">2. Upload Your Resume</h2>
                <p className="app-sub text-zinc-500 mt-1">
                  Upload your resume (.pdf, .docx, .txt) to automatically extract your technical skills.
                </p>
              </div>

              <label
                className={`relative flex items-center justify-center gap-2.5 h-28 w-full rounded-lg border-2 border-dashed transition-all cursor-pointer group ${
                  uploadedFileName
                    ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60"
                    : "border-zinc-700/60 bg-zinc-900/30 hover:border-zinc-500/60 hover:bg-zinc-800/20"
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleResumeUpload(file);
                  }}
                />
                {isExtractingSkills ? (
                  <div className="flex flex-col items-center gap-2">
                    <FiLoader size={22} className="text-zinc-300 animate-spin" />
                    <span className="text-xs text-zinc-300 font-medium">
                      Parsing resume & extracting skills...
                    </span>
                  </div>
                ) : uploadedFileName ? (
                  <div className="flex flex-col items-center gap-1">
                    <FiCheck size={22} className="text-emerald-400" />
                    <span className="text-xs text-emerald-300 font-medium truncate max-w-[260px]">
                      {uploadedFileName}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Click to replace or re-scan resume
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <FiUpload
                      size={22}
                      className="text-zinc-500 group-hover:text-zinc-300 transition-colors"
                    />
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-200 font-medium transition-colors">
                      Click or drag & drop resume here
                    </span>
                    <span className="text-[11px] text-zinc-600">
                      Supports PDF, DOCX, and TXT format
                    </span>
                  </div>
                )}
              </label>

              {uploadedFileName && !isExtractingSkills && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFileName(null);
                      setValue("resumeFileName", "");
                      notifyInfo("Resume detached.");
                    }}
                    className="text-xs text-zinc-500 hover:text-red-400 cursor-pointer transition-colors"
                  >
                    Remove attached resume
                  </button>
                </div>
              )}
            </div>

            {/* Skills Verification Card */}
            <div className="glass-panel p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="app-card-title">Verified Skills ({skillsList.length})</h2>
                  <p className="app-sub text-zinc-500 mt-0.5">
                    Auto-extracted from your resume. Add, refine, or remove as needed.
                  </p>
                </div>
                {errors.skills && (
                  <span className="text-xs text-red-400 shrink-0">
                    {errors.skills.message}
                  </span>
                )}
              </div>

              {/* Manual input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualSkillInput}
                  onChange={(e) => setManualSkillInput(e.target.value)}
                  onKeyDown={handleManualSkillCommit}
                  placeholder="Add skill manually (press Enter or comma)"
                  className={`flex-1 ${INPUT_CLASS}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    addSkill(manualSkillInput);
                    setManualSkillInput("");
                  }}
                  className="h-10 px-3.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-200 text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <FiPlus size={13} />
                  <span>Add</span>
                </button>
              </div>

              {/* Quick suggestions */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-zinc-500">Quick add suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SKILLS.filter(
                    (s) => !skillsList.some((existing) => existing.toLowerCase() === s.toLowerCase())
                  )
                    .slice(0, 8)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addSkill(s)}
                        className="px-2.5 py-1 rounded bg-zinc-900/60 hover:bg-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 border border-white/5 cursor-pointer transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                </div>
              </div>

              {/* Current skills tags */}
              {skillsList.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-3 rounded bg-zinc-900/50 border border-white/[0.06]">
                  {skillsList.map((skill) => (
                    <TagChip
                      key={skill}
                      tag={skill}
                      onRemove={() => removeSkill(skill)}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded bg-zinc-900/40 border border-white/[0.04] text-center">
                  <p className="text-xs text-zinc-500">
                    No skills registered yet — upload your resume or add skills manually above.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Carousel / Navigation Bar */}
        <div className="flex items-center justify-between gap-3 mt-6">
          {currentSlide > 0 ? (
            <button
              type="button"
              onClick={prevSlide}
              className="h-9 px-4 rounded bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-white/10 text-xs font-medium cursor-pointer transition-colors"
            >
              Previous
            </button>
          ) : (
            <div />
          )}

          {currentSlide < SLIDE_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={nextSlide}
              className="h-9 px-5 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-colors cursor-pointer active:scale-[0.99]"
            >
              Continue to Resume &amp; Skills
            </button>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <button
                type="submit"
                disabled={!isAllValid}
                className={`h-9 px-5 rounded font-semibold text-xs transition-all ${
                  isAllValid
                    ? "bg-zinc-100 hover:bg-white text-zinc-950 cursor-pointer active:scale-[0.99]"
                    : "bg-zinc-800/60 text-zinc-500 border border-white/5 cursor-not-allowed opacity-50 shadow-none"
                }`}
                title={
                  isAllValid
                    ? "Save Profile & Proceed to Dashboard"
                    : "Please complete your name, role, and at least one skill"
                }
              >
                Save Profile &amp; Go to Dashboard
              </button>
              {!isAllValid && (
                <span className="text-[11px] text-zinc-500 tracking-tight">
                  Complete required fields to proceed
                </span>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
