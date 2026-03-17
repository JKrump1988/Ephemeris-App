import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoonStar, NotebookText, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";


export default function DailyPage() {
  const navigate = useNavigate();
  const [daily, setDaily] = useState(null);
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/daily"), api.get("/chart/current")])
      .then(([dailyResponse, chartResponse]) => {
        setDaily(dailyResponse.data);
        setChart(chartResponse.data);
      })
      .catch((error) => {
        if (error?.response?.status === 404) {
          navigate("/onboarding", { replace: true });
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return <div className="py-24 text-sm uppercase tracking-[0.24em] text-slate-400" data-testid="daily-loading-state">Loading daily insights…</div>;
  }

  if (!daily || !chart) {
    return null;
  }

  return (
    <div className="space-y-8" data-testid="daily-page">
      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]" data-testid="daily-hero-section">
        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="daily-overview-card">
          <CardContent className="space-y-5 p-7 md:p-9">
            <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Daily astrology system</p>
            <h1 className="font-display text-5xl leading-[0.95] text-white md:text-6xl" data-testid="daily-page-title">Today's cosmic weather, written against your chart.</h1>
            <p className="text-base leading-8 text-slate-200" data-testid="daily-cosmic-weather">{daily.cosmic_weather}</p>
            <p className="text-sm leading-7 text-slate-400" data-testid="daily-generated-note">{daily.note}</p>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="daily-highlights-card">
          <CardContent className="space-y-5 p-7">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Transit highlights</p>
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-3" data-testid="daily-highlights-list">
              {daily.highlights.map((highlight, index) => (
                <div className="border border-white/10 bg-black/30 px-4 py-4 text-sm leading-7 text-slate-100" key={highlight} data-testid={`daily-highlight-${index}`}>{highlight}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2" data-testid="daily-content-grid">
        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="daily-personal-note-card">
          <CardContent className="space-y-4 p-7">
            <div className="flex items-center gap-3">
              <MoonStar className="h-5 w-5 text-primary" />
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Personal transit note</p>
            </div>
            <p className="text-base leading-8 text-slate-200" data-testid="daily-personal-note">{daily.personal_transit_note}</p>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="daily-reflection-card">
          <CardContent className="space-y-4 p-7">
            <div className="flex items-center gap-3">
              <NotebookText className="h-5 w-5 text-primary" />
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Reflection prompt</p>
            </div>
            <p className="text-base leading-8 text-slate-200" data-testid="daily-reflection-prompt">{daily.reflection_prompt}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="daily-chart-context-card">
        <CardContent className="grid gap-4 p-7 md:grid-cols-3">
          {[
            { label: "Sun", value: chart.chart.placements.Sun.sign },
            { label: "Moon", value: chart.chart.placements.Moon.sign },
            { label: "Rising", value: chart.chart.placements.Ascendant.sign },
          ].map((item) => (
            <div className="border border-white/10 bg-black/25 p-4" key={item.label} data-testid={`daily-chart-context-${item.label.toLowerCase()}`}>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
              <p className="mt-2 font-display text-2xl text-white">{item.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}