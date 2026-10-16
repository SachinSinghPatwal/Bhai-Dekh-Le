import React from "react";
import { useLocation } from "react-router-dom";
import { RightSidebar } from "./RightSidebar";
import { useCandidateStore } from "../../store/useCandidateStore";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { isFormFilled, profile } = useCandidateStore();
  const hasFilled = Boolean(isFormFilled || (profile && profile.fullName));

  // Hide sidebar on the candidate details form (/details or / when onboarding)
  const isDetailsForm =
    location.pathname === "/details" || (!hasFilled && location.pathname === "/");

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex relative overflow-x-hidden selection:bg-zinc-800 selection:text-zinc-200">
      {/* Background ambient subtle neutral gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-zinc-800/15 via-zinc-900/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[300px] bg-zinc-800/10 blur-3xl" />
        {/* Subtle grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.035]" 
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* Left-Side Navigation Sidebar - hidden behind/for the user details form */}
      {!isDetailsForm && <RightSidebar />}

      {/* Main Content Area - with left margin to clear the sidebar dock only when visible */}
      <main
        className={`flex-1 transition-all duration-300 relative z-10 px-6 sm:px-10 md:px-14 py-8 lg:py-12 ${
          isDetailsForm ? "ml-0" : "ml-16"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
