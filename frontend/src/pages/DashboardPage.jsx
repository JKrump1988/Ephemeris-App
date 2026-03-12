import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, SunMoon } from "lucide-react";

import { TierCard } from "@/components/common/TierCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";


export default function DashboardPage() {
  const navigate = useNavigate();
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

  const highlights = useMemo(() => {
    if (!chart) return [];
    const placements = chart.chart.placements;
    return [placements.Sun, placements.Moon, placements.Ascendant, placements.Mercury, placements.Venus].filter(Boolean);
  }, [chart]);

  if (loading) {
    return <div className="py-24 text-sm uppercase tracking-[0.24em] text-slate-400" data-testid="dashboard-loading-state">Loading your chart…</div>;
  }

  if (!chart) {
    return null;
  }

  return (
    <div className="space-y-10" data-testid="dashboard-page">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" data-testid="dashboard-hero-section">
        <Card className="overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="dashboard-overview-card">
          <CardContent className="space-y-6 p-7 md:p-9">
            <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Chart overview</p>
            <h1 className="font-display text-4xl text-white md:text-5xl" data-testid="dashboard-title">Your chart has been translated into layered meaning.</h1>
            <p className="max-w-3xl text-base leading-8 text-slate-300" data-testid="dashboard-note">{chart.note}</p>

            <div className="grid gap-4 md:grid-cols-3" data-testid="dashboard-big-three-grid">
              {[
                { label: "Sun", value: chart.chart.placements.Sun.sign },
                { label: "Moon", value: chart.chart.placements.Moon.sign },
                { label: "Rising", value: chart.chart.placements.Ascendant.sign },
              ].map((item) => (
                <div className="border border-white/10 bg-black/35 p-4" key={item.label} data-testid={`dashboard-big-three-${item.label.toLowerCase()}`}>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                  <p className="mt-2 font-display text-2xl text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="dashboard-daily-card">
          <CardContent className="space-y-6 p-7">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Daily astrology</p>
              <SunMoon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-display text-3xl text-white">Return to the present sky.</h2>
            <p className="text-sm leading-7 text-slate-300">See how current transits are interacting with your natal placements and what emotional climate is moving through today.</p>
            <Button className="border border-primary/40 bg-primary px-6 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-primary/90" data-testid="dashboard-daily-link" onClick={() => navigate("/daily")}>Open daily insights</Button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5" data-testid="dashboard-tier-section">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Reading tiers</p>
            <h2 className="mt-2 font-display text-4xl text-white">Expand the same chart through deeper layers.</h2>
          </div>
          <Button className="border border-white/10 bg-white/5 px-5 py-3 text-xs uppercase tracking-[0.24em] text-white hover:bg-white/10" data-testid="dashboard-open-snapshot" onClick={() => navigate("/readings/snapshot")} variant="ghost">
            Open Snapshot
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-5 xl:grid-cols-4">
          {chart.tier_access.map((tier) => (
            <TierCard
              accessible={tier.accessible}
              active={tier.tier === chart.tier_access.find((item) => item.accessible)?.tier}
              includedTopics={tier.included_topics}
              key={tier.tier}
              label={tier.label}
              onOpen={() => navigate(`/readings/${tier.tier}`)}
              teaser={tier.teaser}
              tier={tier.tier}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]" data-testid="dashboard-insight-grid">
        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="dashboard-placement-card">
          <CardContent className="space-y-5 p-7">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Key placements</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {highlights.map((placement) => (
                <div className="border border-white/10 bg-black/35 p-4" key={placement.name} data-testid={`placement-highlight-${placement.name.toLowerCase().replace(/\s+/g, "-")}`}>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{placement.name}</p>
                  <p className="mt-2 font-display text-2xl text-white">{placement.sign}</p>
                  <p className="mt-1 text-sm text-slate-300">{placement.degree}° · House {placement.house || "—"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="dashboard-architecture-card">
          <CardContent className="space-y-5 p-7">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Platform architecture</p>
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            {(overview?.data_flow || []).slice(0, 4).map((item) => (
              <div className="border-t border-white/8 pt-4 text-sm leading-7 text-slate-300 first:border-none first:pt-0" key={item}>{item}</div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}