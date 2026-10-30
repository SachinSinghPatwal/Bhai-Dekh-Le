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
  FiClock,
  FiRadio,
} from "react-icons/fi";
import { parseResumeFile } from "../../utils/resumeParser";

const INPUT_CLASS =
  "w-full h-10 px-3.5 app-input rounded glass-input placeholder-zinc-500 transition-all";
const LABEL_CLASS = "block app-label";

const FALLBACK_IT_ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "React Developer",
  "Angular Developer",
  "Vue.js Developer",
  "Node.js Developer",
  "Python Developer",
  "Java Developer",
  "DevOps Engineer",
  "Cloud Engineer",
  "AWS Solutions Architect",
  "Azure Developer",
  "Data Scientist",
  "Data Analyst",
  "Machine Learning Engineer",
  "AI Engineer",
  "Mobile Developer",
  "Android Developer",
  "iOS Developer",
  "React Native Developer",
  "Flutter Developer",
  "QA Engineer",
  "Test Automation Engineer",
  "Site Reliability Engineer (SRE)",
  "Database Administrator",
  "UI/UX Designer",
  "Product Manager",
  "Scrum Master",
  "Technical Lead",
  "Software Architect",
  "Security Engineer",
  "Penetration Tester",
  "Blockchain Developer",
  "Embedded Systems Engineer",
  "Game Developer",
  "Unity Developer",
  "Data Engineer",
  "ETL Developer",
  "Business Intelligence Developer",
  "SAP Consultant",
  "Salesforce Developer",
  "Shopify Developer",
  "WordPress Developer",
  "TypeScript Developer",
  "Go Developer",
  "Rust Developer",
  "C++ Developer",
  "Kotlin Developer",
  "Spring Boot Developer",
  ".NET Developer",
  "PHP Developer",
  "Laravel Developer",
  "Ruby on Rails Developer",
  "GraphQL Developer",
  "Microservices Developer",
  "Systems Programmer",
  "Network Engineer",
  "IT Support Engineer",
  "Cybersecurity Analyst",
];

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
  "Git",
];

export type ScrapeDurationMinutes = 10 | 15 | 20 | 30 | 45 | 60;

const SCHEDULE_INTERVAL_OPTIONS: {
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
];

const SLIDE_STEPS = [
  { id: 0, title: "Personal Info" },
  { id: 1, title: "Resume & Skills" },
  { id: 2, title: "Scrape Schedule" },
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

  useEffect(() => {
    const fetchApiRoles = async () => {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/datasets/job-titles/master/data/job-titles.json",
        );
        if (response.ok) {
          const data: unknown = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const stringRoles = data
              .map((item: any) =>
                typeof item === "string" ? item : item?.title || item?.name,
              )
              .filter(Boolean);
            const merged = Array.from(
              new Set([...FALLBACK_IT_ROLES, ...stringRoles]),
            );
            setRoles(merged);
          }
        }
      } catch {}
    };
    void fetchApiRoles();
  }, []);

  const filteredRoles = searchTerm.trim()
    ? roles.filter((r) =>
        r.toLowerCase().includes(searchTerm.trim().toLowerCase()),
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
              Use custom role:{" "}
              <strong className="text-zinc-200">"{searchTerm}"</strong>
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
  const { profile, isFormFilled, setDraftProfile, confirmProfileSaved } =
    useCandidateStore();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [attemptedSteps, setAttemptedSteps] = useState<Record<number, boolean>>(
    {},
  );
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(
    profile?.resumeFileName || null,
  );
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [extractedEmail, setExtractedEmail] = useState<string>(
    profile?.email || "",
  );
  const [extractedPhone, setExtractedPhone] = useState<string>(
    profile?.phone || "",
  );
  const [extractedLinks, setExtractedLinks] = useState<string[]>(
    profile?.links || [],
  );
  const [isExtractingSkills, setIsExtractingSkills] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualSkillInput, setManualSkillInput] = useState("");
  const [selectedInterval, setSelectedInterval] =
    useState<ScrapeDurationMinutes>(20);

  useEffect(() => {
    const apiUrl =
      (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/job/schedule`)
      .then((r) => r.json())
      .then((json) => {
        if (json?.data?.intervalMinutes) {
          setSelectedInterval(
            json.data.intervalMinutes as ScrapeDurationMinutes,
          );
        }
      })
      .catch(() => {});
  }, []);

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
      email: profile?.email || "",
      phone: profile?.phone || "",
      links: profile?.links || [],
      resumeFileName: profile?.resumeFileName || "",
      resumeUrl: profile?.resumeUrl || "",
    },
  });

  const formValues = watch();
  const skillsList = watch("skills") || [];
  const currentRole = watch("role") || "";
  const currentEmail = watch("email") || extractedEmail || "";
  const currentPhone = watch("phone") || extractedPhone || "";
  const linksList = watch("links") || extractedLinks || [];

  const isStep0Complete = (vals: Partial<CandidateFormValues>) =>
    (vals.fullName?.trim() || "").length >= 2 &&
    (vals.role?.trim() || "").length >= 2;
  const isStep1Complete = (vals: Partial<CandidateFormValues>) =>
    (vals.skills || []).length >= 1;
  const isStep2Complete = () => Boolean(selectedInterval);

  const step0Valid = isStep0Complete(formValues);
  const step1Valid = isStep1Complete(formValues);
  const step2Valid = isStep2Complete();
  const isAllValid = step0Valid && step1Valid && step2Valid;

  const stepHasError = (stepId: number) => {
    if (stepId === 0)
      return (
        Boolean(errors.fullName || errors.role) ||
        Boolean(attemptedSteps[0] && !step0Valid)
      );
    if (stepId === 1)
      return (
        Boolean(errors.skills) || Boolean(attemptedSteps[1] && !step1Valid)
      );
    if (stepId === 2) return Boolean(attemptedSteps[2] && !step2Valid);
    return false;
  };

  const stepIsComplete = (stepId: number) => {
    if (stepId === 0) return step0Valid;
    if (stepId === 1) return step1Valid;
    if (stepId === 2) return step2Valid;
    return false;
  };

  const addSkill = (skill: string) => {
    const clean = skill.trim();
    if (
      !clean ||
      skillsList.some((s) => s.toLowerCase() === clean.toLowerCase())
    )
      return;
    const updated = [...skillsList, clean];
    setValue("skills", updated, { shouldValidate: true });
    setDraftProfile({ skills: updated });
  };

  const removeSkill = (skill: string) => {
    const updated = skillsList.filter((s) => s !== skill);
    setValue("skills", updated, { shouldValidate: true });
    setDraftProfile({ skills: updated });
  };

  const handleManualSkillCommit = (e?: React.KeyboardEvent) => {
    if (e && e.key !== "Enter" && e.key !== ",") return;
    if (e) e.preventDefault();
    addSkill(manualSkillInput);
    setManualSkillInput("");
  };

  const handleResumeUpload = async (file: File) => {
    setResumeFile(file);
    setUploadedFileName(file.name);
    setValue("resumeFileName", file.name, { shouldValidate: true });
    setDraftProfile({ resumeFileName: file.name });
    setIsExtractingSkills(true);
    notifyInfo("Scanning resume for skills, contact info, and links...");

    try {
      const parsed = await parseResumeFile(file);
      if (parsed.skills.length > 0) {
        const merged = [...new Set([...skillsList, ...parsed.skills])];
        setValue("skills", merged, { shouldValidate: true });
        setDraftProfile({ skills: merged });
      }

      if (parsed.email && !currentEmail) {
        setExtractedEmail(parsed.email);
        setValue("email", parsed.email);
        setDraftProfile({ email: parsed.email });
      }

      if (parsed.phone && !currentPhone) {
        setExtractedPhone(parsed.phone);
        setValue("phone", parsed.phone);
        setDraftProfile({ phone: parsed.phone });
      }

      if (parsed.links && parsed.links.length > 0) {
        const mergedLinks = Array.from(
          new Set([...linksList, ...parsed.links]),
        );
        setExtractedLinks(mergedLinks);
        setValue("links", mergedLinks);
        setDraftProfile({ links: mergedLinks });
      }

      notifySuccess(
        `Parsed "${file.name}": extracted ${parsed.skills.length} skills, ${parsed.links.length} links.`,
      );
    } catch (err) {
      console.warn("Resume parsing notice:", err);
      notifyError(
        "Could not extract details automatically. You can add skills and links manually.",
      );
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
    if (stepId === 2) {
      if (!selectedInterval) {
        setAttemptedSteps((p) => ({ ...p, 2: true }));
        notifyError("Please select a scraping frequency.");
        return false;
      }
      return true;
    }
    return true;
  };

  const nextSlide = async () => {
    const ok = await validateStep(currentSlide);
    if (!ok) return;
    setDraftProfile({
      fullName: formValues.fullName?.trim() || "",
      role: formValues.role?.trim() || "",
      email: formValues.email?.trim() || extractedEmail,
      phone: formValues.phone?.trim() || extractedPhone,
    });
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

  const onSubmit = async (data: CandidateFormValues) => {
    const emailToSave = (data.email || extractedEmail || "").trim();
    const phoneToSave = (data.phone || extractedPhone || "").trim();
    const finalLinks = Array.from(
      new Set([...(data.links || []), ...extractedLinks]),
    );

    setDraftProfile({
      fullName: data.fullName.trim(),
      role: data.role.trim(),
      skills: data.skills,
      email: emailToSave,
      phone: phoneToSave,
      links: finalLinks,
      resumeFileName: resumeFile?.name || uploadedFileName || "",
    });

    try {
      setIsSubmitting(true);
      notifyInfo("Posting profile and resume to Cloudinary...");

      const formData = new FormData();
      if (resumeFile) {
        formData.append("resume", resumeFile);
      }
      formData.append("fullName", data.fullName.trim());
      formData.append("role", data.role.trim());
      formData.append("skills", JSON.stringify(data.skills));

      if (emailToSave) {
        formData.append("email", emailToSave);
      }

      if (phoneToSave) {
        formData.append("phone", phoneToSave);
      }

      if (finalLinks.length > 0) {
        formData.append("links", JSON.stringify(finalLinks));
      }

      if (!resumeFile && profile?.resumeUrl) {
        formData.append("resumeUrl", profile.resumeUrl);
      }

      const apiUrl =
        (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";
      let res: Response;

      try {
        res = await fetch(`${apiUrl}/api/v1/user/upload-resume`, {
          method: "POST",
          body: formData,
        });
      } catch (netErr: any) {
        notifyError(
          netErr?.message ||
            "Could not connect to backend server on port 8000. Please verify the server is running and try again.",
        );
        setCurrentSlide(1);
        setIsSubmitting(false);
        return;
      }

      let resData: any = null;
      try {
        resData = await res.json();
      } catch {
        resData = null;
      }

      if (!res.ok || !resData || resData.success !== true) {
        const backendErrorMessage =
          resData?.message ||
          (res.status
            ? `Backend responded with error (${res.status})`
            : "Something went wrong saving your profile to the backend");

        notifyError(backendErrorMessage);
        setCurrentSlide(1);
        setIsSubmitting(false);
        return;
      }

      const savedResumeUrl =
        resData?.data?.resumeUrl ||
        resData?.resumeUrl ||
        profile?.resumeUrl ||
        "";
      const savedFileName =
        resData?.data?.resumeFileName ||
        resData?.fileName ||
        uploadedFileName ||
        resumeFile?.name ||
        "";

      confirmProfileSaved({
        fullName: data.fullName.trim(),
        role: data.role.trim(),
        skills: data.skills,
        email: emailToSave,
        phone: phoneToSave,
        links: finalLinks,
        resumeUrl: savedResumeUrl,
        resumeFileName: savedFileName,
        searchKeywords: [data.role.trim(), ...data.skills.slice(0, 3)],
      });

      try {
        await fetch(`${apiUrl}/api/v1/job/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intervalMinutes: selectedInterval }),
        });
      } catch {}

      notifySuccess(
        "Profile and scraping schedule saved! Initial scrape dispatched.",
      );
      onCompleted();
    } catch (err: any) {
      notifyError(err?.message || "Something went wrong. Please try again.");
      setCurrentSlide(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = () => {
    setAttemptedSteps({ 0: true, 1: true });
    notifyError("Please complete all required fields before proceeding.");
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 sm:space-y-6 px-1 sm:px-0">
      {isFormFilled && (
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
          Enter your name, role, and attach your resume to upload to Cloudinary
          and extract skills.
        </p>
      </div>

      <div
        className="relative grid p-1 rounded bg-zinc-900/60 border border-white/[0.06] overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${SLIDE_STEPS.length}, minmax(0, 1fr))`,
        }}
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
          <div
            className={
              currentSlide === 0
                ? "block slide-content-active space-y-5"
                : "hidden"
            }
          >
            <div className="glass-panel p-3.5 sm:p-6 space-y-4 sm:space-y-5">
              <div>
                <h2 className="app-card-title">1. Personal Information</h2>
                <p className="app-sub text-zinc-500 mt-1">
                  Tell us who you are and the IT role you are targeting.
                </p>
              </div>

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
                  onChange={(e) => {
                    setValue("fullName", e.target.value, {
                      shouldValidate: !!attemptedSteps[0],
                    });
                    setDraftProfile({ fullName: e.target.value });
                  }}
                />
              </div>

              <RoleSearchDropdown
                value={currentRole}
                onChange={(val) => {
                  setValue("role", val, {
                    shouldValidate: !!attemptedSteps[0],
                  });
                  setDraftProfile({ role: val });
                }}
                error={errors.role?.message}
              />
            </div>
          </div>

          <div
            className={
              currentSlide === 1
                ? "block slide-content-active space-y-5"
                : "hidden"
            }
          >
            <div className="glass-panel p-3.5 sm:p-6 space-y-4">
              <div>
                <h2 className="app-card-title">2. Upload Your Resume</h2>
                <p className="app-sub text-zinc-500 mt-1">
                  Upload your resume (.pdf, .docx, .txt) to host on Cloudinary
                  and automatically extract your technical skills, contact info,
                  and profile links.
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
                    if (file) void handleResumeUpload(file);
                  }}
                />
                {isExtractingSkills ? (
                  <div className="flex flex-col items-center gap-2">
                    <FiLoader
                      size={22}
                      className="text-zinc-300 animate-spin"
                    />
                    <span className="text-xs text-zinc-300 font-medium">
                      Scanning resume & extracting skills and links...
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
                      setResumeFile(null);
                      setUploadedFileName(null);
                      setValue("resumeFileName", "");
                      setDraftProfile({ resumeFileName: "" });
                      notifyInfo("Resume detached.");
                    }}
                    className="text-xs text-zinc-500 hover:text-red-400 cursor-pointer transition-colors"
                  >
                    Remove attached resume
                  </button>
                </div>
              )}
            </div>

            <div className="glass-panel p-3.5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="app-card-title">
                    Verified Skills ({skillsList.length})
                  </h2>
                  <p className="app-sub text-zinc-500 mt-0.5">
                    Auto-extracted from your resume. Add, refine, or remove as
                    needed.
                  </p>
                </div>
                {errors.skills && (
                  <span className="text-xs text-red-400 shrink-0">
                    {errors.skills.message}
                  </span>
                )}
              </div>

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

              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-zinc-500">
                  Quick add suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SKILLS.filter(
                    (s) =>
                      !skillsList.some(
                        (existing) =>
                          existing.toLowerCase() === s.toLowerCase(),
                      ),
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
                    No skills registered yet — upload your resume or add skills
                    manually above.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div
            className={
              currentSlide === 2
                ? "block slide-content-active space-y-5"
                : "hidden"
            }
          >
            <div className="glass-panel p-3.5 sm:p-6 space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
                <div>
                  <h2 className="app-card-title flex items-center gap-2">
                    <FiClock className="text-emerald-400" />
                    <span>3. Automated Scraping Schedule</span>
                  </h2>
                  <p className="app-sub text-zinc-500 mt-1">
                    Select how frequently the background fleet scrapes job
                    portals. An initial scrape runs immediately.
                  </p>
                </div>
                <span className="app-caption px-2.5 py-1 rounded bg-zinc-900 border border-white/10 font-mono text-zinc-300 self-start sm:self-auto shrink-0">
                  Every{" "}
                  {selectedInterval === 60 ? "1 hr" : `${selectedInterval}m`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SCHEDULE_INTERVAL_OPTIONS.map((opt) => {
                  const isSelected = selectedInterval === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedInterval(opt.value)}
                      className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
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

              <div className="p-3 rounded bg-zinc-900/40 border border-white/[0.04] text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                <span>First Scrape Session:</span>
                <span className="text-emerald-400 font-semibold">
                  Immediate upon profile completion
                </span>
              </div>
            </div>
          </div>
        </div>

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
              {currentSlide === 0
                ? "Continue to Resume & Skills"
                : "Continue to Scrape Schedule"}
            </button>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <button
                type="submit"
                disabled={!isAllValid || isSubmitting}
                className={`h-9 px-5 rounded font-semibold text-xs transition-all flex items-center gap-2 ${
                  isAllValid && !isSubmitting
                    ? "bg-zinc-100 hover:bg-white text-zinc-950 cursor-pointer active:scale-[0.99]"
                    : "bg-zinc-800/60 text-zinc-500 border border-white/5 cursor-not-allowed opacity-50 shadow-none"
                }`}
                title={
                  isAllValid
                    ? "Save Profile & Proceed to Dashboard"
                    : "Please complete your name, role, and at least one skill"
                }
              >
                {isSubmitting ? (
                  <>
                    <FiLoader size={13} className="animate-spin" />
                    <span>Uploading &amp; Saving...</span>
                  </>
                ) : (
                  <span>Save Profile &amp; Go to Dashboard</span>
                )}
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
