import React, { useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  motion,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
} from "framer-motion";

export function DockIcon({
  mouseX,
  title,
  icon,
  href,
  onClick,
  isActive: propIsActive,
}: {
  mouseX: MotionValue<number>;
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-100, 0, 100], [40, 62, 40]);
  const heightTransform = useTransform(distance, [-100, 0, 100], [40, 62, 40]);
  const iconScaleTransform = useTransform(distance, [-100, 0, 100], [1, 1.45, 1]);

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 170,
    damping: 14,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 170,
    damping: 14,
  });
  const iconScale = useSpring(iconScaleTransform, {
    mass: 0.1,
    stiffness: 170,
    damping: 14,
  });

  const handleMouseEnter = () => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth >= 768 &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      setHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  const renderContent = (active: boolean) => (
    <motion.div
      ref={ref}
      style={{ width, height }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={() => setHovered(false)}
      className={`relative flex items-center justify-center rounded-xl border-[1.75px] transition-colors cursor-pointer shadow-sm p-0 m-0 ${
        active
          ? "border-white/90 bg-white/15 text-white shadow-[0_0_12px_rgba(255,255,255,0.25)]"
          : "border-white/30 bg-white/[0.04] text-zinc-400 hover:border-white/30 hover:bg-white/[0.08] hover:text-zinc-200"
      }`}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: -45, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1 px-2.5 py-1 rounded-md border border-white/20 bg-zinc-950/95 text-[11px] font-mono text-white whitespace-nowrap shadow-xl hidden md:block"
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        style={{ scale: iconScale }}
        className="flex items-center justify-center pointer-events-none origin-center"
      >
        {icon}
      </motion.div>
    </motion.div>
  );

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }

    if (href && href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);

      if (target) {
        window.history.pushState(null, "", href);

        const win = window as unknown as {
          lenis?: {
            scrollTo: (
              target: Element | string | number,
              options?: {
                offset?: number;
                duration?: number;
                easing?: (t: number) => number;
                immediate?: boolean;
              },
            ) => void;
          };
        };

        if (win?.lenis && typeof win.lenis.scrollTo === "function") {
          win.lenis.scrollTo(target, {
            duration: 1.2,
          });
        } else {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    }
  };

  if (href) {
    const isInternalRoute = href.startsWith("/");
    if (isInternalRoute) {
      return (
        <NavLink
          to={href}
          onClick={handleClick}
          className="flex items-end justify-center p-0 m-0"
        >
          {({ isActive }) => renderContent(isActive)}
        </NavLink>
      );
    }

    const isExternal =
      href.startsWith("http://") || href.startsWith("https://");

    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        onClick={handleClick}
        className="flex items-end justify-center p-0 m-0"
      >
        {renderContent(false)}
      </a>
    );
  }

  return (
    <div onClick={onClick} className="flex items-end justify-center p-0 m-0">
      {renderContent(Boolean(propIsActive))}
    </div>
  );
}
