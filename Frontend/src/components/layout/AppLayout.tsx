import React from "react";
import { FloatingDock } from "./FloatingDock";
import { useCandidateStore } from "../../store/useCandidateStore";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isFormFilled } = useCandidateStore();

  const isDetailsForm = !isFormFilled;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col relative overflow-x-clip selection:bg-zinc-800 selection:text-zinc-200">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-zinc-800/15 via-zinc-900/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[300px] bg-zinc-800/10 blur-3xl" />
        <div 
          className="absolute inset-0 opacity-[0.035]" 
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      <main
        className={`flex-1 transition-all duration-300 relative z-10 px-2.5 sm:px-8 md:px-12 py-5 sm:py-8 lg:py-12 ${
          isDetailsForm ? "pb-12" : "pb-28 sm:pb-32"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {!isDetailsForm && <FloatingDock />}
    </div>
  );
};
