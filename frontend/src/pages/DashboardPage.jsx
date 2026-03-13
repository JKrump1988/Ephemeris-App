import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpenText, LockKeyhole, Sparkles, SunMoon } from "lucide-react";
import { toast } from "sonner";

import { AstrologerChatPanel } from "@/components/common/AstrologerChatPanel";
import { NatalChartWheel } from "@/components/common/NatalChartWheel";
import { TierCard } from "@/components/common/TierCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";


export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [chart, setChart] = useState(null);
  const [overview, setOverview] = useState(null);
  const [billing, setBilling] = useState(null);
  const [academy, setAcademy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncingPayment, setSyncingPayment] = useState(false);

  const loadDashboardData = useCallback(async () => {
    const [chartResponse, overviewResponse, billingResponse, academyResponse] = await Promise.all([
      api.get("/chart/current"),
      api.get("/platform/overview"),
      api.get("/billing/tiers"),
      api.get("/academy/catalog"),
    ]);
    setChart(chartResponse.data);
    setOverview(overviewResponse.data);
    setBilling(billingResponse.data);
    setAcademy(academyResponse.data);
  }, []);

  useEffect(() => {
    loadDashboardData()
      .catch((error) => {
        if (error?.response?.status === 404) {
          navigate("/onboarding", { replace: true });
        }
      })
      .finally(() => setLoading(false));
  }, [loadDashboardData, navigate]);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const checkoutState = searchParams.get("checkout");
    const tier = searchParams.get("tier");

    if (checkoutState === "cancel") {
      toast.message(`Stripe checkout for ${tier || "your tier"} was cancelled.`);
      navigate("/dashboard", { replace: true });
      return;
    }

    if (checkoutState !== "success" || !sessionId || syncingPayment) {
      return;
    }

    let cancelled = false;
    setSyncingPayment(true);

    const pollStatus = async (attempt = 0) => {
      try {
        const response = await api.get(`/billing/checkout/status/${sessionId}`);
        if (cancelled) return;
        if (response.data.payment_status === "paid") {
          await refreshUser();
          await loadDashboardData();
          toast.success(response.data.message || "Tier unlocked successfully.");
          navigate("/dashboard", { replace: true });
          setSyncingPayment(false);
          return;
        }
        if (attempt >= 5) {
          toast.error("Payment is still processing. Please refresh your dashboard in a moment.");
          navigate("/dashboard", { replace: true });
          setSyncingPayment(false);
          return;
        }
        window.setTimeout(() => pollStatus(attempt + 1), 2000);
      } catch {
        if (!cancelled) {
          toast.error("Unable to confirm the Stripe checkout yet.");
          setSyncingPayment(false);
        }
      }
    };

    pollStatus();
    return () => { cancelled = true; };
  }, [loadDashboardData, navigate, refreshUser, searchParams, syncingPayment]);

  const startCheckout = async (tier) => {
    try {
      const response = await api.post("/billing/checkout/session", {
        tier,
        origin_url: window.location.origin,
      });
      window.location.href = response.data.url;
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Unable to start Stripe checkout right now.");
    }
  };

  const highlights = useMemo(() => {
    if (!chart) return [];
    const placements = chart.chart.placements;
    return [placements.Sun, placements.Moon, placements.Ascendant, placements.Mercury, placements.Venus].filter(Boolean);
  }, [chart]);

  const currentUnlockedTier = useMemo(() => {
    const accessibleTiers = chart?.tier_access?.filter((item) => item.accessible) || [];
    return accessibleTiers[accessibleTiers.length - 1]?.tier;
  }, [chart]);

  if (loading) {
    return <div className="py-24 text-sm uppercase tracking-[0.24em] text-slate-400" data-testid="dashboard-loading-state">Loading your chart…</div>;
  }

  if (!chart) {
    return null;
  }

  return (
    <div className="space-y-10" data-testid="dashboard-page">
      <section className="grid gap-4 xl:grid-cols-4" data-testid="dashboard-quick-access-grid">
        {[
          { title: "Snapshot reading", body: "Return to your free core layer immediately.", action: "Open Snapshot", onClick: () => navigate("/readings/snapshot"), icon: Sparkles, testId: "dashboard-quick-snapshot" },
          { title: "Daily astrology", body: "See the present sky interacting with your natal chart.", action: "Open Daily", onClick: () => navigate("/daily"), icon: SunMoon, testId: "dashboard-quick-daily" },
          { title: "Premium layers", body: "Preview or unlock Profile, Blueprint, and Master through Stripe.", action: "View tiers", onClick: () => document.getElementById("premium-tier-section")?.scrollIntoView({ behavior: "smooth" }), icon: LockKeyhole, testId: "dashboard-quick-premium" },
          { title: "Ephemeral Academy", body: "Explore the future-ready course structure for astrology learning.", action: "Open Academy", onClick: () => navigate("/academy"), icon: BookOpenText, testId: "dashboard-quick-academy" },
        ].map((item) => (
          <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" key={item.title} data-testid={item.testId}>
            <CardContent className="space-y-4 p-5">
              <item.icon className="h-5 w-5 text-primary" />
              <h2 className="font-display text-3xl text-white">{item.title}</h2>
              <p className="text-sm leading-7 text-slate-300">{item.body}</p>
              <Button className="border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.24em] text-white hover:bg-white/10" data-testid={`${item.testId}-button`} onClick={item.onClick} variant="ghost">
                {item.action}
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

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

      <section className="space-y-5" data-testid="dashboard-tier-section" id="premium-tier-section">
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
          {chart.tier_access.map((tier) => {
            const billingTier = billing?.tiers?.find((item) => item.tier === tier.tier);
            return (
            <TierCard
              accessible={tier.accessible}
              active={tier.tier === currentUnlockedTier}
              amount={billingTier?.amount}
              currency={billingTier?.currency}
              includedTopics={tier.included_topics}
              key={tier.tier}
              label={tier.label}
              onOpen={() => navigate(`/readings/${tier.tier}`)}
              onUnlock={tier.accessible || tier.tier === "snapshot" ? undefined : () => startCheckout(tier.tier)}
              premiumStory={billingTier?.premium_story}
              teaser={tier.teaser}
              tier={tier.tier}
            />
            );
          })}
        </div>
      </section>

      <NatalChartWheel chart={chart.chart} />

      <AstrologerChatPanel variant="dashboard" />

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

      {academy?.courses?.[0] ? (
        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="dashboard-academy-preview-card">
          <CardContent className="grid gap-6 p-7 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Ephemeral Academy</p>
              <h2 className="font-display text-4xl text-white">A future course shell is already prepared.</h2>
              <p className="text-sm leading-7 text-slate-300">The Academy can host lesson modules, video or text lessons, and locked premium learning paths without changing the core product architecture.</p>
              <Button className="border border-primary/40 bg-primary px-5 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-primary/90" data-testid="dashboard-open-academy-button" onClick={() => navigate("/academy")}>
                Explore Academy
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2" data-testid="dashboard-academy-course-preview-grid">
              {academy.courses.slice(0, 2).map((course) => (
                <div className="border border-white/10 bg-black/25 p-5" key={course.id} data-testid={`dashboard-academy-course-${course.id}`}>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{course.level}</p>
                  <p className="mt-2 font-display text-2xl text-white">{course.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{course.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}