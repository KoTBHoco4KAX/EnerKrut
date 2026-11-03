import { History, LayoutGrid, Package } from "lucide-react";
import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/", label: "Кейсы", icon: LayoutGrid, end: true },
  { to: "/inventory", label: "Инвентарь", icon: Package, end: false },
  { to: "/history", label: "История", icon: History, end: false },
] as const;

export function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border-base bg-bg-base/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex min-h-[56px] flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
                  isActive ? "text-accent-neon" : "text-text-muted"
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
