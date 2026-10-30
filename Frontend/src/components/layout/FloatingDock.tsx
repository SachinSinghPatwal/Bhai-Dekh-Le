import React from "react";
import { motion, useMotionValue } from "framer-motion";
import { LayoutDashboard, Briefcase, User, FileText } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { cn } from "../../lib/utils";
import { DockIcon } from "./DockIcon";
import { useCandidateStore } from "../../store/useCandidateStore";

interface DockItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function FloatingDock({ className = "" }: { className?: string }) {
  const mouseX = useMotionValue(Infinity);
  const { profile } = useCandidateStore();

  const githubLink = profile?.links?.find((l) => l.includes("github.com"));

  const items: DockItem[] = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      href: "/dashboard",
    },
    {
      title: "Jobs",
      icon: <Briefcase className="h-4 w-4" />,
      href: "/jobs",
    },
    {
      title: "Profile",
      icon: <User className="h-4 w-4" />,
      href: "/profile",
    },
  ];

  if (profile?.resumeUrl) {
    items.push({
      title: "Resume",
      icon: <FileText className="h-4 w-4" />,
      href: profile.resumeUrl,
    });
  }

  if (githubLink) {
    items.push({
      title: "GitHub",
      icon: <FaGithub className="h-4 w-4" />,
      href: githubLink,
    });
  }

  return (
    <div
      className={cn(
        "fixed bottom-3 sm:bottom-6 inset-x-0 z-50 flex justify-center pointer-events-none px-4",
        className,
      )}
    >
      <motion.nav
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        onTouchEnd={() => mouseX.set(Infinity)}
        className="pointer-events-auto flex items-end h-14 sm:h-14 gap-1 sm:gap-2.25 px-2 sm:px-2.5 pb-2 sm:pb-1.75 rounded-xl border border-white/40 bg-black/85 backdrop-blur-2xl shadow-2xl shadow-black/80 max-w-[calc(100vw-1.5rem)]"
      >
        {items.map((item) => (
          <React.Fragment key={item.title}>
            <DockIcon
              mouseX={mouseX}
              title={item.title}
              icon={item.icon}
              href={item.href}
              onClick={item.onClick}
              isActive={item.isActive}
            />
          </React.Fragment>
        ))}
      </motion.nav>
    </div>
  );
}

export default FloatingDock;
