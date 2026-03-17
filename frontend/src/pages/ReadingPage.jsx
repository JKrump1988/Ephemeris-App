import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LockKeyhole, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { ReadingSection } from "@/components/common/ReadingSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";


export default function ReadingPage() {
  const navigate = useNavigate();
  const { tier } = useParams();
  const [reading, setReading] = useState(null);
  const [chart, setChart] = useState(null);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get(`/readings/${tier}`), api.get("/chart/current"), api.get("/billing/tiers")])
      .then(([readingResponse, chartResponse, billingResponse]) => {
        setReading(readingResponse.data);
        setChart(chartResponse.data);
        setBilling(billingResponse.data);
      })
      .catch((error) => {
        if (error?.response?.status === 404) {
          navigate("/onboarding", { replace: true });
        }
      })
      .finally(() => setLoading(false));
  }, [navigate, tier]);

  const activeTier = useMemo(() => chart?.tier_access?.find((item) => item.tier === tier), [chart, tier]);
  const billingTier = useMemo(() => billing?.tiers?.find((item) => item.tier === tier), [billing, tier]);

  const startCheckout = async () => {
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

  if (loading) {
    return <div className="py-24 text-sm uppercase tracking-[0.24em] text-slate-400" data-testid="reading-loading-state">Loading your reading…</div>;
  }

  if (!reading || !chart) {
    return null;
  }

  return (
    <div className="space-y-8 pb-16" data-testid="reading-page">
      <section className="grid gap-6 lg:grid-cols-[1fr_0.78fr]" data-testid="reading-hero-section">
        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="reading-summary-card">
          <CardContent className="space-y-5 p-7 md:p-9">
            <p className="text-[11px] uppercase tracking-[0.28em] text-primary">{reading.title}</p>
            <h1 className="font-display text-5xl text-white md:text-6xl" data-testid="reading-title">{reading.title} reading</h1>
            <p className="max-w-3xl text-base leading-8 text-slate-200" data-testid="reading-summary">{reading.summary}</p>
            <p className="text-sm leading-7 text-slate-400" data-testid="reading-note">{reading.note}</p>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="reading-tier-navigation-card">
          <CardContent className="space-y-5 p-7">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Tier navigation</p>
            <div className="grid gap-3" data-testid="reading-tier-navigation">
              {chart.tier_access.map((item) => (
                <Button
                  className={`justify-between border px-4 py-3 text-xs uppercase tracking-[0.22em] ${item.tier === tier ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 bg-white/5 text-white hover:bg-white/10"}`}
                  data-testid={`reading-tier-link-${item.tier}`}
                  key={item.tier}
                  onClick={() => navigate(`/readings/${item.tier}`)}
                  variant="ghost"
                >
                  {item.label}
                  {item.accessible ? <Sparkles className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                </Button>
              ))}
            </div>
            {activeTier ? <p className="text-sm leading-7 text-slate-300" data-testid="reading-tier-teaser">{activeTier.teaser}</p> : null}
          </CardContent>
        </Card>
      </section>

      {!reading.accessible ? (
        <Card className="border border-primary/20 bg-primary/10 backdrop-blur-xl" data-testid="reading-locked-topics-card">
          <CardContent className="space-y-4 p-7">
            <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Preview mode</p>
            <p className="text-sm leading-7 text-slate-100">This page is showing a preview of the next layer. The locked topics below outline what this tier expands into.</p>
            {billingTier ? (
              <div className="border border-primary/20 bg-black/25 px-4 py-4" data-testid="reading-locked-tier-pricing">
                <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Stripe unlock</p>
                <p className="mt-2 font-display text-3xl text-white">{new Intl.NumberFormat("en-US", { style: "currency", currency: billingTier.currency.toUpperCase() }).format(billingTier.amount)}</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">Buying {billingTier.label} includes every layer beneath it, and after payment you return to the dashboard with refreshed tier access.</p>
                <Button className="mt-4 border border-primary/45 bg-primary px-5 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-primary/90" data-testid="reading-unlock-tier-button" onClick={startCheckout}>
                  Unlock with Stripe
                </Button>
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2" data-testid="reading-locked-topics-list">
              {reading.locked_topics.map((topic) => (
                <div className="border border-primary/20 bg-black/25 px-4 py-4 text-sm text-slate-100" key={topic}>{topic}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-6" data-testid="reading-sections-list">
        {reading.sections.map((section, index) => (
          <ReadingSection index={index} key={`${section.title}-${index}`} section={section} />
        ))}
      </section>
    </div>
  );
}