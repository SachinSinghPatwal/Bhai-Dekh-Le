import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CandidateProfile } from "../types/candidate";
import { getApiUrl } from "../lib/api";

interface CandidateStoreState {
  profile: CandidateProfile | null;
  isFormFilled: boolean;
  currentSlide: number;
  isHydratingProfile: boolean;
  hasHydratedFromBackend: boolean;
  setProfile: (profile: CandidateProfile) => void;
  setDraftProfile: (profile: Partial<CandidateProfile>) => void;
  confirmProfileSaved: (profile: CandidateProfile) => void;
  setIsFormFilled: (filled: boolean) => void;
  setCurrentSlide: (slide: number) => void;
  hydrateFromBackend: () => Promise<void>;
  clearProfile: () => void;
}

const getInitialProfileState = () => {
  try {
    const raw = localStorage.getItem("cms-candidate-storage");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.isFormFilled && parsed?.state?.profile?.fullName) {
        return {
          profile: parsed.state.profile as CandidateProfile,
          isFormFilled: true,
          currentSlide: Number(parsed?.state?.currentSlide) || 0,
        };
      }
      if (parsed?.state?.profile) {
        return {
          profile: parsed.state.profile as CandidateProfile,
          isFormFilled: false,
          currentSlide: Number(parsed?.state?.currentSlide) || 0,
        };
      }
    }
  } catch {}
  return {
    profile: null,
    isFormFilled: false,
    currentSlide: 0,
  };
};

const initialState = getInitialProfileState();

let hydratePromise: Promise<void> | null = null;

export const useCandidateStore = create<CandidateStoreState>()(
  persist(
    (set, get) => ({
      profile: initialState.profile,
      isFormFilled: initialState.isFormFilled,
      currentSlide: initialState.currentSlide,
      isHydratingProfile: false,
      hasHydratedFromBackend: false,
      setProfile: (profile) => set({ profile, isFormFilled: true }),
      setDraftProfile: (draft) =>
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, ...draft }
            : (draft as CandidateProfile),
          isFormFilled: state.isFormFilled,
        })),
      confirmProfileSaved: (profile) =>
        set({ profile, isFormFilled: true, currentSlide: 0 }),
      setIsFormFilled: (isFormFilled) => set({ isFormFilled }),
      setCurrentSlide: (currentSlide) => set({ currentSlide }),
      hydrateFromBackend: async () => {
        if (hydratePromise) return hydratePromise;
        hydratePromise = (async () => {
          set({ isHydratingProfile: true });
          try {
            const res = await fetch(`${getApiUrl()}/api/v1/user/profile`);
            if (!res.ok) return;
            const json = await res.json();
            const data = json?.data;
            if (!data) return;

            const personal = data.personalDetails || data;
            const remoteFullName = String(
              data.fullname ||
                personal.fullName ||
                personal.fullname ||
                personal.name ||
                "",
            ).trim();
            const remoteRole = String(data.role || personal.role || "").trim();
            const remoteEmail = String(
              data.email || personal.email || "",
            ).trim();
            const remotePhone = String(
              data.phone || personal.phone || "",
            ).trim();
            const remoteSkills: string[] = Array.isArray(data.skills)
              ? data.skills
              : Array.isArray(personal.skills)
                ? personal.skills
                : [];
            const remoteLinks: string[] = Array.isArray(data.links)
              ? data.links
              : Array.isArray(personal.links)
                ? personal.links
                : [];
            const remoteResumeUrl = String(
              data.resume?.path ||
                personal.resumePath ||
                personal.resumeLink ||
                personal.resumeUrl ||
                "",
            ).trim();
            const remoteResumeFileName = String(
              data.resume?.fileName || personal.resumeFileName || "",
            ).trim();

            const isValidSavedProfile =
              Boolean(remoteFullName) &&
              remoteFullName !== "Job Seeker" &&
              remoteSkills.length > 0 &&
              (json?.source === "database" || Boolean(remoteRole));

            const state = get();
            const hasLocalDraft =
              !state.isFormFilled &&
              Boolean(
                state.profile?.fullName ||
                  state.profile?.role ||
                  (state.profile?.skills && state.profile.skills.length > 0),
              );

            if (!isValidSavedProfile || hasLocalDraft) {
              return;
            }

            const hydratedProfile: CandidateProfile = {
              fullName: remoteFullName,
              role: remoteRole || state.profile?.role || "",
              email: remoteEmail || state.profile?.email || "",
              phone: remotePhone || state.profile?.phone || "",
              skills:
                remoteSkills.length > 0
                  ? remoteSkills
                  : state.profile?.skills || [],
              links:
                remoteLinks.length > 0
                  ? remoteLinks
                  : state.profile?.links || [],
              resumeUrl: remoteResumeUrl || state.profile?.resumeUrl || "",
              resumeFileName:
                remoteResumeFileName || state.profile?.resumeFileName || "",
              searchKeywords: [
                remoteRole || state.profile?.role || "",
                ...remoteSkills.slice(0, 3),
              ].filter(Boolean),
            };

            set({
              profile: hydratedProfile,
              isFormFilled: true,
            });
          } catch {
            // Fall back gracefully to local persisted store
          } finally {
            set({
              isHydratingProfile: false,
              hasHydratedFromBackend: true,
            });
            hydratePromise = null;
          }
        })();
        return hydratePromise;
      },
      clearProfile: () =>
        set({ profile: null, isFormFilled: false, currentSlide: 0 }),
    }),
    {
      name: "cms-candidate-storage",
      partialize: (state) => ({
        profile: state.profile,
        isFormFilled: state.isFormFilled,
        currentSlide: state.currentSlide,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state?.isFormFilled) {
          if (state) state.isFormFilled = false;
        }
      },
    },
  ),
);
