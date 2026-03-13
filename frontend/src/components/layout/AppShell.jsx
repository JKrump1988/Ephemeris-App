import { Link, NavLink } from "react-router-dom";
import { MoonStar, Sparkles, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";


const privateLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/readings/snapshot", label: "Readings" },
  { to: "/daily", label: "Daily" },
  { to: "/academy", label: "Academy" },
  { to: "/account", label: "Account" },
];


export function AppShell({ children }) {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground" data-testid="app-shell">
      <div className="noise-overlay" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(123,97,255,0.16),_transparent_36%),radial-gradient(circle_at_80%_20%,_rgba(212,175,55,0.1),_transparent_28%),linear-gradient(180deg,#050508_0%,#050508_100%)]" />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-black/45 backdrop-blur-xl" data-testid="top-navigation">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 md:px-10">
          <Link className="flex items-center gap-3" to="/" data-testid="brand-home-link">
            <div className="flex h-11 w-11 items-center justify-center border border-white/15 bg-white/5 text-primary shadow-[0_0_30px_rgba(123,97,255,0.2)]">
              <MoonStar className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl tracking-tight text-white" data-testid="brand-title">Ephemeral</p>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400" data-testid="brand-tagline">Editorial cosmic astrology</p>
            </div>
          </Link>

          <nav className="flex flex-1 flex-wrap items-center justify-end gap-3 md:gap-6" data-testid="primary-navigation-links">
            {isAuthenticated ? privateLinks.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) => cn(
                  "text-xs uppercase tracking-[0.24em] text-slate-400 transition-colors hover:text-primary",
                  isActive && "text-primary",
                )}
                to={item.to}
                data-testid={`nav-link-${item.label.toLowerCase()}`}
              >
                {item.label}
              </NavLink>
            )) : (
              <>
                <a href="#feature-map" className="text-xs uppercase tracking-[0.24em] text-slate-400 transition-colors hover:text-primary" data-testid="nav-link-features">Features</a>
                <a href="#tier-map" className="text-xs uppercase tracking-[0.24em] text-slate-400 transition-colors hover:text-primary" data-testid="nav-link-tiers">Tiers</a>
                <a href="#architecture" className="text-xs uppercase tracking-[0.24em] text-slate-400 transition-colors hover:text-primary" data-testid="nav-link-architecture">Architecture</a>
              </>
            )}

            {isAuthenticated ? (
              <Button
                className="border border-white/15 bg-white/5 px-5 py-2 text-xs uppercase tracking-[0.24em] text-white hover:bg-white/10"
                onClick={logout}
                data-testid="logout-button"
                variant="ghost"
              >
                <UserRound className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            ) : (
              <Button asChild className="border border-primary/50 bg-primary px-5 py-2 text-xs uppercase tracking-[0.24em] text-black hover:bg-primary/90" data-testid="start-reading-button">
                <Link to="/auth">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Start your reading
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10 px-6 pb-16 pt-28 md:px-10 md:pt-32" data-testid="page-content">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}