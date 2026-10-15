import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  FiGrid, 
  FiBriefcase, 
  FiSettings, 
  FiEdit3, 
  FiUser,
  FiUserCheck
} from "react-icons/fi";
import { useCandidateStore } from "../../store/useCandidateStore";

export const RightSidebar: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const { profile } = useCandidateStore();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: FiGrid,
    },
    {
      name: "Jobs",
      path: "/jobs",
      icon: FiBriefcase,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: FiSettings,
    },
    {
      name: "Change Details",
      path: "/details",
      icon: FiEdit3,
    },
  ];

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed left-0 top-0 h-screen z-50 transition-all duration-300 ease-in-out border-r border-white/10 bg-[#111116]/95 backdrop-blur-2xl flex flex-col justify-between select-none shadow-[8px_0_30px_rgba(0,0,0,0.6)] ${
        isHovered ? "w-64" : "w-16"
      }`}
    >
      {/* Top Header / Profile Info */}
      <div>
        <div className="h-16 flex items-center px-3.5 border-b border-white/[0.08] overflow-hidden">
          {isHovered ? (
            <div className="flex items-center space-x-2.5 overflow-hidden w-full">
              <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-white/10 flex items-center justify-center shrink-0">
                <FiUser className="text-zinc-300 text-sm" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="app-label text-zinc-200 truncate font-semibold">
                  {profile?.fullName || "Candidate Hub"}
                </span>
                <span className="app-caption text-zinc-400 truncate">
                  {profile?.role || "CMS Panel"}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-white/10 flex items-center justify-center">
                <FiUser className="text-zinc-300 text-sm" />
              </div>
            </div>
          )}
        </div>

        {/* Navigation list - well spaced without sub p elements */}
        <nav className="p-3 space-y-4 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => navigate(item.path)}
                title={!isHovered ? item.name : undefined}
                className={`w-full flex items-center rounded-xl transition-all duration-200 group relative cursor-pointer sidebar-nav-item ${
                  !isHovered ? "justify-center h-11" : "px-3.5 space-x-3.5 h-11"
                } ${
                  isActive
                    ? "active"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                }`}
              >
                <Icon
                  className={`text-lg shrink-0 transition-colors ${
                    isActive ? "text-zinc-100" : "text-zinc-400 group-hover:text-zinc-200"
                  }`}
                />

                {isHovered && (
                  <span className="app-label text-zinc-200 truncate font-medium">
                    {item.name}
                  </span>
                )}

                {/* Tooltip for collapsed view on left sidebar */}
                {!isHovered && (
                  <div className="absolute left-full ml-2.5 hidden group-hover:flex items-center px-2.5 py-1 rounded-md app-sub font-medium tracking-wide bg-zinc-900 border border-white/10 text-zinc-200 shadow-xl whitespace-nowrap z-50 pointer-events-none">
                    {item.name}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Account Status - user icon instead of green dot */}
      <div className="p-3 border-t border-white/[0.08]">
        {isHovered ? (
          <div className="flex items-center space-x-3 p-2 rounded-xl bg-zinc-900/60 border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-white/10 flex items-center justify-center shrink-0">
              <FiUserCheck className="text-zinc-200 text-sm" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="app-label text-zinc-200 truncate font-medium">
                {profile?.fullName || "Account"}
              </span>
              <span className="app-caption text-zinc-400 truncate flex items-center gap-1">
                <FiUserCheck className="w-3 h-3 text-zinc-400" />
                Active Account
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center group relative">
            <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700/80 transition-all cursor-pointer shadow-sm">
              <FiUserCheck className="text-base text-zinc-200" />
            </div>
            {/* Tooltip for collapsed view */}
            <div className="absolute left-full ml-2.5 hidden group-hover:flex items-center px-2.5 py-1 rounded-md app-sub font-medium tracking-wide bg-zinc-900 border border-white/10 text-zinc-200 shadow-xl whitespace-nowrap z-50 pointer-events-none">
              {profile?.fullName ? `Account: ${profile.fullName}` : "Active Account"}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
