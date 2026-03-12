import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Bot, LockKeyhole, UserRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";


export default function AccountPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chart, setChart] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/chart/current"), api.get("/platform/overview")])
      .then(([chartResponse, overviewResponse]) => {
        setChart(chartResponse.data);
        setOverview(overviewResponse.data);
      })
      .catch((error) => {
        if (error?.response?.status === 404) {
          navigate("/onboarding", { replace: true });
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return <div className="py-24 text-sm uppercase tracking-[0.24em] text-slate-400" data-testid="account-loading-state">Loading account details…</div>;
  }

  if (!chart || !user) {
    return null;
  }

  return (
    <div className="space-y-8" data-testid="account-page">
      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]" data-testid="account-header-section">
        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="account-profile-card">
          <CardContent className="space-y-6 p-7 md:p-9">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center border border-primary/30 bg-primary/10 text-primary">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Account</p>
                <h1 className="font-display text-4xl text-white" data-testid="account-name">{user.name}</h1>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border border-white/10 bg-black/25 p-4" data-testid="account-email-card">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Email</p>
                <p className="mt-2 text-sm text-slate-100">{user.email}</p>
              </div>
              <div className="border border-white/10 bg-black/25 p-4" data-testid="account-tier-card">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Current access</p>
                <p className="mt-2 font-display text-2xl text-white">{user.subscription_tier}</p>
              </div>
            </div>
            <p className="text-sm leading-7 text-slate-300" data-testid="account-chart-note">{chart.note}</p>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="account-birth-context-card">
          <CardContent className="space-y-5 p-7">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Saved chart</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border border-white/10 bg-black/25 p-4" data-testid="account-birth-date-card">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Birth date</p>
                <p className="mt-2 text-sm text-slate-100">{chart.birth_date}</p>
              </div>
              <div className="border border-white/10 bg-black/25 p-4" data-testid="account-birth-time-card">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Birth time</p>
                <p className="mt-2 text-sm text-slate-100">{chart.birth_time || "12:00 UT assumed"}</p>
              </div>
              <div className="border border-white/10 bg-black/25 p-4 md:col-span-2" data-testid="account-location-card">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Birth location</p>
                <p className="mt-2 text-sm leading-7 text-slate-100">{chart.location_name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]" data-testid="account-access-section">
        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="account-tier-access-card">
          <CardContent className="space-y-5 p-7">
            <div className="flex items-center gap-3">
              <LockKeyhole className="h-5 w-5 text-primary" />
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Tier access map</p>
            </div>
            <div className="space-y-3" data-testid="account-tier-access-list">
              {chart.tier_access.map((tier) => (
                <div className="border border-white/10 bg-black/25 px-4 py-4 text-sm text-slate-100" key={tier.tier} data-testid={`account-tier-${tier.tier}`}>
                  <p className="font-display text-2xl text-white">{tier.label}</p>
                  <p className="mt-2 leading-7 text-slate-300">{tier.teaser}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-primary">{tier.accessible ? "Available now" : "Locked preview"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="account-ai-architecture-card">
            <CardContent className="space-y-5 p-7">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-primary" />
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">AI astrologer architecture</p>
              </div>
              {(overview?.ai_astrologer_architecture || []).map((item) => (
                <div className="text-sm leading-7 text-slate-200" key={item}>{item}</div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="account-academy-architecture-card">
            <CardContent className="space-y-5 p-7">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Ephemeral Academy structure</p>
              </div>
              {(overview?.future_course_integration_structure || []).map((item) => (
                <div className="text-sm leading-7 text-slate-200" key={item}>{item}</div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}