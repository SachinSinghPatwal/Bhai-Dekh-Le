import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CandidateProfile, JobMetricStats } from "../types/candidate";

interface CandidateStoreState {
  profile: CandidateProfile | null;
  isFormFilled: boolean;
  jobStats: JobMetricStats;
  setProfile: (profile: CandidateProfile) => void;
  setDraftProfile: (profile: Partial<CandidateProfile>) => void;
  confirmProfileSaved: (profile: CandidateProfile) => void;
  setIsFormFilled: (filled: boolean) => void;
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
        };
      }
      if (parsed?.state?.profile) {
        return {
          profile: parsed.state.profile as CandidateProfile,
          isFormFilled: false,
        };
      }
    }
  } catch {}
  return {
    profile: null,
    isFormFilled: false,
  };
};

const initialState = getInitialProfileState();

export const useCandidateStore = create<CandidateStoreState>()(
  persist(
    (set) => ({
      profile: initialState.profile,
      isFormFilled: initialState.isFormFilled,
      jobStats: {
        appliedCount: 0,
        inReviewCount: 0,
        interviewsCount: 0,
        offersCount: 0,
        rejectionsCount: 0,
      },
      setProfile: (profile) => set({ profile, isFormFilled: true }),
      setDraftProfile: (draft) =>
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, ...draft }
            : (draft as CandidateProfile),
          isFormFilled: false,
        })),
      confirmProfileSaved: (profile) => set({ profile, isFormFilled: true }),
      setIsFormFilled: (isFormFilled) => set({ isFormFilled }),
      clearProfile: () => set({ profile: null, isFormFilled: false }),
    }),
    {
      name: "cms-candidate-storage",
      onRehydrateStorage: () => (state) => {
        if (!state?.isFormFilled) {
          if (state) state.isFormFilled = false;
        }
      },
    },
  ),
);
