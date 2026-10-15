import React, { useState } from "react";
import {
  useForm,
  useFieldArray,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  candidateSchema,
  type CandidateFormValues,
} from "../../schema/candidateSchema";
import { useCandidateStore } from "../../store/useCandidateStore";
import { notifyError, notifySuccess, notifyInfo } from "../../utils/toast";

const INPUT_CLASS =
  "w-full h-10 px-3.5 app-input rounded-xl glass-input placeholder-zinc-500 transition-all";
const LABEL_CLASS = "block app-label";

// Reusable Form Field Component (DRY)
interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  registration: UseFormRegisterReturn;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  registration,
  ...props
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-2">
      <label className={LABEL_CLASS}>{label}</label>
      {error && (
        <span className="app-sub text-red-400 font-normal truncate" title={error}>
          {error}
        </span>
      )}
    </div>
    <input {...registration} {...props} className={INPUT_CLASS} />
  </div>
);

// Reusable Tag Input & Chip Group (DRY)
interface TagInputGroupProps {
  label: string;
  placeholder: string;
  tags: string[];
  error?: string;
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}

const TagInputGroup: React.FC<TagInputGroupProps> = ({
  label,
  placeholder,
  tags,
  error,
  onAdd,
  onRemove,
}) => {
  const [val, setVal] = useState("");

  const handleCommit = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && "key" in e && e.key !== "Enter" && e.key !== ",") return;
    if (e) e.preventDefault();
    const clean = val.trim().replace(/^,+|,+$/g, "");
    if (!clean) return;
    onAdd(clean);
    setVal("");
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <label className={LABEL_CLASS}>{label}</label>
        {error && (
          <span className="text-xs text-red-400 font-normal truncate" title={error}>
            {error}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleCommit}
          placeholder={placeholder}
          className={`flex-1 ${INPUT_CLASS}`}
        />
        <button
          type="button"
          onClick={() => handleCommit()}
          className="h-10 px-3.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-200 text-xs font-medium transition-colors cursor-pointer shrink-0"
        >
          Add
        </button>
      </div>

      {/* Tag container is only mounted when tags length > 0 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2.5 rounded-xl bg-zinc-900/50 border border-white/[0.06]">
          {tags.map((tag) => (
            <span
              key={tag}
              className="h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-2 bg-zinc-800/90 text-zinc-200 border border-white/10"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => onRemove(tag)}
                className="text-zinc-400 hover:text-zinc-100 cursor-pointer text-sm leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

interface CandidateDetailsFormProps {
  onCompleted: () => void;
}

const SLIDE_STEPS = [
  { id: 0, title: "Personal & Resume" },
  { id: 1, title: "Skills & Keywords" },
  { id: 2, title: "Education" },
  { id: 3, title: "Projects" },
];

export const CandidateDetailsForm: React.FC<CandidateDetailsFormProps> = ({
  onCompleted,
}) => {
  const { profile, setProfile } = useCandidateStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [attemptedSteps, setAttemptedSteps] = useState<Record<number, boolean>>({});
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(
    profile?.resumeFileName || null,
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    trigger,
    formState: { errors },
  } = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      fullName: profile?.fullName || "",
      role: profile?.role || "",
      experienceYears: profile?.experienceYears || "",
      expectedSalary: profile?.expectedSalary || "",
      skills: profile?.skills || [],
      searchKeywords: profile?.searchKeywords || [],
      bio: profile?.bio || "",
      graduationStatus: profile?.graduationStatus || "graduated",
      graduationDegree: profile?.graduationDegree || "",
      graduationYear: profile?.graduationYear || "",
      projects:
        profile?.projects && profile.projects.length > 0
          ? profile.projects
          : [
              {
                id: "p-1",
                title: "",
                description: "",
                techStack: "",
                link: "",
              },
            ],
      resumeFileName: profile?.resumeFileName || "",
    },
  });

  const {
    fields: projectFields,
    append: appendProject,
    remove: removeProject,
  } = useFieldArray({
    control,
    name: "projects",
  });

  const formValues = watch();
  const skillsList = watch("skills") || [];
  const keywordsList = watch("searchKeywords") || [];
  const graduationStatus = watch("graduationStatus");

  // Step Completion Validation Helpers
  const isStep0Complete = (vals: Partial<CandidateFormValues>) => {
    const name = vals.fullName?.trim() || "";
    const role = vals.role?.trim() || "";
    const exp = vals.experienceYears?.toString().trim() || "";
    const sal = vals.expectedSalary?.trim() || "";
    return name.length >= 2 && role.length >= 2 && exp.length >= 1 && sal.length >= 1;
  };

  const isStep1Complete = (vals: Partial<CandidateFormValues>) => {
    const skills = vals.skills || [];
    const kws = vals.searchKeywords || [];
    return skills.length >= 1 && kws.length >= 1;
  };

  const isStep2Complete = (vals: Partial<CandidateFormValues>) => {
    const status = vals.graduationStatus;
    const year = vals.graduationYear?.trim() || "";
    return Boolean(status) && year.length >= 4;
  };

  const isStep3Complete = (vals: Partial<CandidateFormValues>) => {
    const projs = vals.projects || [];
    if (projs.length === 0) return false;
    return projs.every(
      (p) =>
        Boolean(p.title && p.title.trim().length >= 1) &&
        Boolean(p.techStack && p.techStack.trim().length >= 1) &&
        Boolean(p.description && p.description.trim().length >= 5)
    );
  };

  const step0Valid = isStep0Complete(formValues);
  const step1Valid = isStep1Complete(formValues);
  const step2Valid = isStep2Complete(formValues);
  const step3Valid = isStep3Complete(formValues);
  const isAllValid = step0Valid && step1Valid && step2Valid && step3Valid;

  const stepHasError = (stepId: number) => {
    if (stepId === 0) {
      const hasFieldErr = Boolean(
        errors.fullName ||
          errors.role ||
          errors.experienceYears ||
          errors.expectedSalary
      );
      return hasFieldErr || Boolean(attemptedSteps[0] && !step0Valid);
    }
    if (stepId === 1) {
      const hasFieldErr = Boolean(errors.skills || errors.searchKeywords);
      return hasFieldErr || Boolean(attemptedSteps[1] && !step1Valid);
    }
    if (stepId === 2) {
      const hasFieldErr = Boolean(
        errors.graduationStatus || errors.graduationYear
      );
      return hasFieldErr || Boolean(attemptedSteps[2] && !step2Valid);
    }
    if (stepId === 3) {
      const hasFieldErr = Boolean(errors.projects);
      return hasFieldErr || Boolean(attemptedSteps[3] && !step3Valid);
    }
    return false;
  };

  const stepIsComplete = (stepId: number) => {
    if (stepId === 0) return step0Valid;
    if (stepId === 1) return step1Valid;
    if (stepId === 2) return step2Valid;
    if (stepId === 3) return step3Valid;
    return false;
  };

  const handleAddTag = (
    list: string[],
    key: "skills" | "searchKeywords",
    item: string,
  ) => {
    if (list.includes(item)) return;
    setValue(key, [...list, item], { shouldValidate: true });
  };

  const handleRemoveTag = (
    list: string[],
    key: "skills" | "searchKeywords",
    item: string,
  ) => {
    setValue(
      key,
      list.filter((x) => x !== item),
      { shouldValidate: true },
    );
  };

  // Send Resume Handler - attaches resume file without auto-extracting/overwriting fields
  const handleSendResume = (file: File) => {
    setUploadedFileName(file.name);
    setValue("resumeFileName", file.name, { shouldValidate: true });
    notifySuccess(`Resume "${file.name}" sent and attached.`);
  };

  const validateStep = async (stepId: number): Promise<boolean> => {
    if (stepId === 0) {
      const valid = await trigger([
        "fullName",
        "role",
        "experienceYears",
        "expectedSalary",
      ]);
      if (!valid) {
        setAttemptedSteps((prev) => ({ ...prev, 0: true }));
        notifyError("Please fill the required personal details.");
        return false;
      }
      return true;
    }
    if (stepId === 1) {
      const valid = await trigger(["skills", "searchKeywords"]);
      if (!valid) {
        setAttemptedSteps((prev) => ({ ...prev, 1: true }));
        notifyError("Please add your skills and portal keywords.");
        return false;
      }
      return true;
    }
    if (stepId === 2) {
      const valid = await trigger(["graduationStatus", "graduationYear"]);
      if (!valid) {
        setAttemptedSteps((prev) => ({ ...prev, 2: true }));
        notifyError("Please complete education credentials.");
        return false;
      }
      return true;
    }
    if (stepId === 3) {
      const valid = await trigger(["projects"]);
      if (!valid) {
        setAttemptedSteps((prev) => ({ ...prev, 3: true }));
        notifyError("Please complete your project details.");
        return false;
      }
      return true;
    }
    return true;
  };

  const nextSlide = async () => {
    const isCurrentValid = await validateStep(currentSlide);
    if (!isCurrentValid) return;
    setCurrentSlide((prev) => Math.min(prev + 1, SLIDE_STEPS.length - 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };

  const handleStepClick = async (targetStepId: number) => {
    if (targetStepId === currentSlide) return;

    // Moving backward is always allowed
    if (targetStepId < currentSlide) {
      setCurrentSlide(targetStepId);
      return;
    }

    // Moving forward: sequentially validate steps leading up to targetStepId
    for (let step = 0; step < targetStepId; step++) {
      const valid = await validateStep(step);
      if (!valid) {
        setCurrentSlide(step);
        return;
      }
    }

    setCurrentSlide(targetStepId);
  };

  const onSubmit = (data: CandidateFormValues) => {
    try {
      setProfile({
        fullName: data.fullName,
        role: data.role,
        experienceYears: data.experienceYears,
        expectedSalary: data.expectedSalary,
        skills: data.skills,
        searchKeywords: data.searchKeywords,
        projects: (data.projects || []).map((p, idx) => ({
          id: p.id || `p-${idx + 1}`,
          title: p.title || "Project",
          description: p.description || "",
          techStack: p.techStack || "",
          link: p.link || "",
        })),
        bio: data.bio,
        graduationStatus: data.graduationStatus,
        graduationDegree: data.graduationDegree || "",
        graduationYear: data.graduationYear,
        resumeFileName: uploadedFileName || undefined,
      });

      notifySuccess("Candidate profile saved! Heading to Dashboard.");
      onCompleted();
    } catch {
      notifyError("Failed to save profile. Please review the inputs.");
    }
  };

  // If there are errors on earlier slides when submitting, jump to the first error slide
  const onError = () => {
    if (
      errors.fullName ||
      errors.role ||
      errors.experienceYears ||
      errors.expectedSalary
    ) {
      setAttemptedSteps((prev) => ({ ...prev, 0: true }));
      setCurrentSlide(0);
      notifyError("Please fill the required personal details.");
    } else if (errors.skills || errors.searchKeywords) {
      setAttemptedSteps((prev) => ({ ...prev, 1: true }));
      setCurrentSlide(1);
      notifyError("Please add your skills and portal keywords.");
    } else if (errors.graduationStatus || errors.graduationYear) {
      setAttemptedSteps((prev) => ({ ...prev, 2: true }));
      setCurrentSlide(2);
      notifyError("Please check education credentials.");
    } else if (errors.projects) {
      setAttemptedSteps((prev) => ({ ...prev, 3: true }));
      setCurrentSlide(3);
      notifyError("Please complete your project details.");
    }
  };

  return (
    <div className="max-w-[560px] mx-auto space-y-6 pb-24">
      {/* Centered Page Header */}
      <div className="text-center space-y-3 pt-2">
        <h1 className="app-heading-page">
          Personal & Career Details
        </h1>
      </div>

      {/* Slidable Carousel Step Indicators with Status Dots & Sliding Active Background */}
      <div className="relative grid grid-cols-4 p-1 rounded-xl bg-zinc-900/60 border border-white/[0.06] overflow-hidden">
        {/* Animated sliding active indicator pill transitioning between steps */}
        <div
          className="absolute top-1 bottom-1 rounded-lg bg-zinc-800 border border-white/15 shadow-sm transition-transform duration-300 ease-out pointer-events-none z-0"
          style={{
            left: "4px",
            width: "calc((100% - 8px) / 4)",
            transform: `translateX(calc(${currentSlide} * 100%))`,
          }}
        />

        {SLIDE_STEPS.map((step) => {
          const isActive = currentSlide === step.id;
          const isPassed = currentSlide > step.id;
          const hasError = stepHasError(step.id);
          const isComplete = stepIsComplete(step.id);

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(step.id)}
              className={`relative z-10 py-2 px-1 sm:px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer truncate text-center flex items-center justify-center gap-1.5 ${
                isActive
                  ? "text-zinc-100 font-semibold"
                  : isPassed
                    ? "text-zinc-300 hover:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {hasError ? (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 shadow-[0_0_6px_rgba(248,113,113,0.8)]"
                  title="Incomplete / Needs attention"
                />
              ) : isComplete ? (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shrink-0"
                  title="Completed"
                />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
              )}
              <span className="truncate">{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Adaptive Carousel Form */}
      <form
        onSubmit={handleSubmit(onSubmit, onError)}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            (e.target as HTMLElement).tagName === "INPUT"
          ) {
            e.preventDefault();
          }
        }}
      >
        <div className="w-full">
          {/* Slide 1: Personal Details & Send Resume */}
          <div className={currentSlide === 0 ? "block slide-content-active space-y-5" : "hidden"}>
            {/* Send Resume Card */}
            <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-3">
              <div className="pt-1">
                <label className="cursor-pointer h-9 px-4 w-full rounded-lg bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-200 border border-white/10 text-xs font-medium flex items-center justify-center transition-all shadow-sm">
                  <span className="truncate">
                    {uploadedFileName
                      ? "Change Resume File"
                      : "Send Resume File"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSendResume(file);
                    }}
                  />
                </label>
              </div>

              {uploadedFileName && (
                <div className="pt-1.5 flex items-center justify-between text-xs text-zinc-400">
                  <span className="truncate">
                    Sent Resume:{" "}
                    <strong className="text-zinc-200">
                      {uploadedFileName}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFileName(null);
                      setValue("resumeFileName", "");
                      notifyInfo("Resume detached.");
                    }}
                    className="text-zinc-400 hover:text-zinc-200 text-xs underline cursor-pointer shrink-0 ml-3"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Personal Details Card */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
              <h2 className="app-card-title">
                1. Personal & Target Role
              </h2>

              <div className="space-y-4">
                <FormField
                  label="Full Name *"
                  placeholder="e.g. Alex Morgan"
                  registration={register("fullName")}
                  error={errors.fullName?.message}
                />

                <FormField
                  label="Target Role / Designation *"
                  placeholder="e.g. Senior Frontend Engineer"
                  registration={register("role")}
                  error={errors.role?.message}
                />

                <div className="grid grid-cols-2 gap-3.5">
                  <FormField
                    label="Experience (Years) *"
                    placeholder="e.g. 3.5"
                    registration={register("experienceYears")}
                    error={errors.experienceYears?.message}
                  />

                  <FormField
                    label="Expected Salary / Rate *"
                    placeholder="e.g. $110,000 / yr"
                    registration={register("expectedSalary")}
                    error={errors.expectedSalary?.message}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Slide 2: Skills & Portal Keywords */}
          <div className={currentSlide === 1 ? "block slide-content-active space-y-5" : "hidden"}>
            <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
              <h2 className="app-card-title">
                2. Skills & Portal Search Keywords
              </h2>

              <div className="space-y-5">
                <TagInputGroup
                  label="Technical Skills *"
                  placeholder="Type skill & press Enter (e.g. React, TypeScript)"
                  tags={skillsList}
                  error={errors.skills?.message}
                  onAdd={(tag) => handleAddTag(skillsList, "skills", tag)}
                  onRemove={(tag) =>
                    handleRemoveTag(skillsList, "skills", tag)
                  }
                />

                <TagInputGroup
                  label="Job Portal Searched Keywords *"
                  placeholder="e.g. Remote Frontend Developer, React Lead"
                  tags={keywordsList}
                  error={errors.searchKeywords?.message}
                  onAdd={(tag) =>
                    handleAddTag(keywordsList, "searchKeywords", tag)
                  }
                  onRemove={(tag) =>
                    handleRemoveTag(keywordsList, "searchKeywords", tag)
                  }
                />
              </div>
            </div>
          </div>

          {/* Slide 3: Education & Degree Credentials */}
          <div className={currentSlide === 2 ? "block slide-content-active space-y-5" : "hidden"}>
            <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
              <h2 className="app-card-title">
                3. Education & Degree Credentials
              </h2>

              <div className="space-y-4">
                <FormField
                  label="Degree / Qualification"
                  placeholder="e.g. B.Tech Computer Science / BS Software Engineering"
                  registration={register("graduationDegree")}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className={LABEL_CLASS}>Enrollment Status *</label>
                    {errors.graduationStatus && (
                      <span className="text-xs text-red-400 font-normal truncate">
                        {errors.graduationStatus.message}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: "graduated", label: "Completed / Degree Holder" },
                      { id: "pursuing", label: "Currently Enrolled" },
                      { id: "other", label: "Bootcamp / Self-Taught" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setValue("graduationStatus", opt.id as any, {
                            shouldValidate: true,
                          })
                        }
                        className={`flex items-center justify-center text-center p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                          graduationStatus === opt.id
                            ? "bg-zinc-800 text-zinc-100 border-white/20 shadow-sm ring-1 ring-white/10"
                            : "bg-zinc-900/50 text-zinc-400 border-white/5 hover:border-white/10 hover:text-zinc-200"
                        }`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <FormField
                  label="Year of Completion / Expected *"
                  placeholder="e.g. 2024"
                  registration={register("graduationYear")}
                  error={errors.graduationYear?.message}
                />
              </div>
            </div>
          </div>

          {/* Slide 4: Projects */}
          <div className={currentSlide === 3 ? "block slide-content-active space-y-5" : "hidden"}>
            <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="app-card-title">
                  4. Key Projects ({projectFields.length}) *
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    appendProject({
                      id: `p-${Date.now()}`,
                      title: "",
                      description: "",
                      techStack: "",
                      link: "",
                    })
                  }
                  className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 text-xs font-medium cursor-pointer transition-colors"
                >
                  + Add Project
                </button>
              </div>

              <div className="space-y-4">
                {projectFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.06] space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">
                        Project #{index + 1}
                      </span>
                      {projectFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProject(index)}
                          className="text-zinc-500 hover:text-zinc-300 text-xs px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                          title="Remove Project"
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <FormField
                        label="Title *"
                        placeholder="e.g. Distributed Task Queue"
                        registration={register(
                          `projects.${index}.title` as const,
                        )}
                        error={errors.projects?.[index]?.title?.message}
                      />

                      <FormField
                        label="Tech Stack *"
                        placeholder="e.g. React, Node.js, Zustand, Vite"
                        registration={register(
                          `projects.${index}.techStack` as const,
                        )}
                        error={errors.projects?.[index]?.techStack?.message}
                      />

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className={LABEL_CLASS}>Description *</label>
                          {errors.projects?.[index]?.description && (
                            <span className="text-xs text-red-400 font-normal truncate">
                              {errors.projects[index]?.description?.message}
                            </span>
                          )}
                        </div>
                        <textarea
                          rows={2}
                          {...register(
                            `projects.${index}.description` as const,
                          )}
                          placeholder="Summary of the problem solved and core features..."
                          className="w-full px-3 py-2 text-sm rounded-lg glass-input text-zinc-100 placeholder-zinc-500 resize-none"
                        />
                      </div>

                      <FormField
                        label="Project / Repository Link"
                        placeholder="https://github.com/..."
                        type="url"
                        registration={register(
                          `projects.${index}.link` as const,
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Navigation Bar - Sits right below the active content with a relative margin */}
        <div className="flex items-center justify-between gap-3 mt-6">
          {currentSlide > 0 ? (
            <button
              type="button"
              onClick={prevSlide}
              className="h-9 px-4 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-white/10 text-xs font-medium cursor-pointer transition-colors"
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
              className="h-9 px-5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium cursor-pointer transition-colors shadow-sm active:scale-[0.99] ml-auto"
            >
              Next Step
            </button>
          ) : (
            <div className="flex flex-col items-end gap-1.5 ml-auto">
              <button
                type="submit"
                disabled={!isAllValid}
                className={`h-9 px-5 rounded-lg text-xs font-medium transition-all shadow-sm ${
                  isAllValid
                    ? "bg-zinc-100 hover:bg-white text-zinc-950 cursor-pointer active:scale-[0.99]"
                    : "bg-zinc-800/60 text-zinc-500 border border-white/5 cursor-not-allowed opacity-50 shadow-none"
                }`}
                title={
                  isAllValid
                    ? "Save Profile & Proceed to Dashboard"
                    : "Fill all required inputs across all sections to save profile"
                }
              >
                Save Profile & Move to Dashboard
              </button>
              {!isAllValid && (
                <span className="text-[11px] text-zinc-500 tracking-tight">
                  Fill all required inputs across sections to enable
                </span>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
