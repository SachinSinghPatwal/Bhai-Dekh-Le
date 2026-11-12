import React from "react";
import { motion, useMotionValue } from "framer-motion";
import { LayoutDashboard, Briefcase, User } from "lucide-react";
import { cn } from "../../lib/utils";
import { DockIcon } from "./DockIcon";

interface DockItem {
  title: string;
  icon: React.ReactNode;
  href: string;
}

const DOCK_ITEMS: DockItem[] = [
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

export function FloatingDock({ className = "" }: { className?: string }) {
  const mouseX = useMotionValue(Infinity);

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
        className="pointer-events-auto flex items-end h-14 gap-1 sm:gap-2.25 px-2 sm:px-2.5 pb-2 sm:pb-1.75 rounded-xl border border-white/40 bg-black/85 backdrop-blur-2xl shadow-2xl shadow-black/80 max-w-[calc(100vw-1.5rem)]"
      >
        {DOCK_ITEMS.map((item) => (
          <DockIcon
            key={item.title}
            mouseX={mouseX}
            title={item.title}
            icon={item.icon}
            href={item.href}
          />
        ))}
      </motion.nav>
    </div>
  );
}

export default FloatingDock;
