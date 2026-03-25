import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpenText, ChartColumn, Compass, LockKeyhole, Stars } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";


const defaultOverview = {
  product_feature_map: [
    "Email/password authentication and saved chart ownership.",
    "Ephemeris-based natal chart generation from birth date, time, and place.",
    "Layered reading tiers from Snapshot through Master.",
    "Daily transit insights grounded in the natal chart.",
  ],
  system_architecture: [
    "React frontend for intake, dashboard, tier pages, and editorial presentation.",
    "FastAPI backend for auth, chart persistence, ephemeris calculations, and reading logic.",
    "MongoDB for users, charts, and future subscription state.",
  ],
  monetization_flow: [
    "Snapshot is free.",
    "Profile, Blueprint, and Master deepen the same chart instead of restarting the journey.",
    "Daily insights can evolve into a recurring subscription later.",
  ],
  ai_astrologer_architecture: [
    "Future AI astrologer will reference saved chart data instead of recalculating placements.",
  ],
  future_course_integration_structure: [
    "Ephemeral Academy can embed external lesson systems while keeping progress tied to the user profile.",
  ],
};


const tierHighlights = [
  { label: "Snapshot", teaser: "Sun, Moon, Rising, Big Three interplay, and your personality overview." },
  { label: "Profile", teaser: "Mercury, Venus, Mars, element balance, modality balance, and personal aspects." },
  { label: "Blueprint", teaser: "House structure, chart ruler, Saturn lessons, North Node, and vocation themes." },
  { label: "Master", teaser: "Current transits, timing cycles, growth periods, and the unfolding present chapter." },
];


export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [overview, setOverview] = useState(defaultOverview);

  useEffect(() => {
    api.get("/platform/overview")
      .then((response) => setOverview(response.data))
      .catch(() => setOverview(defaultOverview));
  }, []);

  const featureCards = useMemo(() => overview.product_feature_map.slice(0, 4), [overview]);

  return (
    <div className="space-y-24 pb-16 md:space-y-32" data-testid="landing-page">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end" data-testid="landing-hero-section">
        <motion.div animate={{ opacity: 1, y: 0 }} className="space-y-8" initial={{ opacity: 0, y: 30 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-primary" data-testid="landing-hero-badge">
            <Stars className="h-4 w-4" />
            Ephemeris-led astrology, not generic filler
          </div>

          <div className="space-y-6">
            <h1 className="max-w-4xl font-display text-5xl leading-[0.92] tracking-tight text-white sm:text-6xl lg:text-7xl" data-testid="landing-hero-title">
              A layered astrology platform built from actual sky positions and shaped with editorial depth.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-300 md:text-lg" data-testid="landing-hero-description">
              Ephemeral calculates your natal chart from birth data, then expands the same chart into Snapshot, Profile, Blueprint, and Master readings. The experience is designed to feel intimate, psychologically precise, and ready for future growth.
            </p>
          </div>

          <div className="flex flex-wrap gap-4" data-testid="landing-hero-actions">
            <Button asChild className="border border-primary/40 bg-primary px-6 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-primary/90" data-testid="landing-primary-cta">
              <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
                Start reading
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild className="border border-white/15 bg-white/5 px-6 py-3 text-xs uppercase tracking-[0.24em] text-white hover:bg-white/10" data-testid="landing-secondary-cta" variant="ghost">
              <Link to={isAuthenticated ? "/daily" : "/auth"}>View the daily layer</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden border border-white/10 bg-white/5 p-5 shadow-[0_35px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl" initial={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.7, delay: 0.15 }} data-testid="landing-hero-visual">
          <img
            alt="Cosmic editorial background"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
            data-testid="landing-hero-image"
            src="https://images.unsplash.com/photo-1771448233778-6191ff960f55?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHw0fHxjb3NtaWMlMjBuZWJ1bGElMjBkYXJrJTIwdGV4dHVyZSUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzczMzU2MjYwfDA&ixlib=rb-4.1.0&q=85"
          />
          <div className="relative grid gap-4 md:grid-cols-2">
            {[
              { icon: ChartColumn, label: "Natal engine", value: "Big Three, planets, nodes, aspects, houses" },
              { icon: LockKeyhole, label: "Tier model", value: "Snapshot → Profile → Blueprint → Master" },
              { icon: Compass, label: "Daily layer", value: "Transit weather and personal note" },
              { icon: BookOpenText, label: "Future-ready", value: "AI astrologer and academy architecture" },
            ].map((item) => (
              <Card className="border border-white/10 bg-black/45 backdrop-blur-xl" key={item.label} data-testid={`hero-metric-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                <CardContent className="space-y-3 p-5">
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{item.label}</p>
                  <p className="text-sm leading-7 text-slate-100">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="grid gap-6 lg:grid-cols-4" id="feature-map" data-testid="landing-feature-map">
        {featureCards.map((item, index) => (
          <Card className="border border-white/10 bg-white/5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl" key={item} data-testid={`feature-card-${index}`}>
            <CardContent className="space-y-4 p-6">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Feature map</p>
              <p className="font-display text-2xl text-white">0{index + 1}</p>
              <p className="text-sm leading-7 text-slate-300">{item}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]" id="tier-map" data-testid="landing-tier-map">
        <div className="space-y-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Reading model</p>
          <h2 className="font-display text-4xl text-white md:text-5xl" data-testid="landing-tier-title">One chart. Four layers of meaning.</h2>
          <p className="max-w-xl text-base leading-8 text-slate-300" data-testid="landing-tier-description">
            Every tier expands from the same natal calculation. The product grows deeper without forcing the user to restart their story.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {tierHighlights.map((tier) => (
            <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" key={tier.label} data-testid={`landing-tier-${tier.label.toLowerCase()}`}>
              <CardContent className="space-y-4 p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-primary">{tier.label}</p>
                <p className="text-sm leading-7 text-slate-200">{tier.teaser}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]" id="architecture" data-testid="landing-architecture-section">
        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="architecture-card-system">
          <CardContent className="space-y-5 p-7">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">System architecture</p>
            {overview.system_architecture.map((item) => (
              <div className="border-t border-white/8 pt-4 text-sm leading-7 text-slate-200 first:border-none first:pt-0" key={item}>{item}</div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="architecture-card-monetization">
            <CardContent className="space-y-5 p-7">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Monetization flow</p>
              {overview.monetization_flow.map((item) => (
                <div className="text-sm leading-7 text-slate-200" key={item}>{item}</div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="architecture-card-future-modules">
            <CardContent className="space-y-5 p-7">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Future modules</p>
              {[...overview.ai_astrologer_architecture.slice(0, 1), ...overview.future_course_integration_structure.slice(0, 1)].map((item) => (
                <div className="text-sm leading-7 text-slate-200" key={item}>{item}</div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}