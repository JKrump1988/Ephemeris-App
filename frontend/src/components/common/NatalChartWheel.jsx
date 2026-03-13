import { Card, CardContent } from "@/components/ui/card";


const SIGN_LABELS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const PLANET_ABBREVIATIONS = {
  Sun: "Su",
  Moon: "Mo",
  Mercury: "Me",
  Venus: "Ve",
  Mars: "Ma",
  Jupiter: "Ju",
  Saturn: "Sa",
  Uranus: "Ur",
  Neptune: "Ne",
  Pluto: "Pl",
  "North Node": "NN",
  Ascendant: "Asc",
};
const ASPECT_COLORS = {
  Conjunction: "rgba(212, 175, 55, 0.45)",
  Sextile: "rgba(123, 97, 255, 0.45)",
  Square: "rgba(244, 63, 94, 0.45)",
  Trine: "rgba(45, 212, 191, 0.45)",
  Opposition: "rgba(226, 232, 240, 0.38)",
};
const DISPLAY_ORDER = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "North Node", "Ascendant"];


function polarPoint(cx, cy, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}


function wrappedMidpoint(start, end) {
  let adjustedEnd = end;
  if (adjustedEnd < start) adjustedEnd += 360;
  return (start + adjustedEnd) / 2 % 360;
}


function formatPlacement(placement) {
  return `${placement.sign} · ${placement.degree}°${placement.house ? ` · House ${placement.house}` : ""}`;
}


export function NatalChartWheel({ chart }) {
  const placements = DISPLAY_ORDER.map((key) => chart?.placements?.[key]).filter(Boolean);
  const aspects = (chart?.aspects || []).slice(0, 18);
  const houseCusps = chart?.houses?.cusps || [];
  const size = 620;
  const center = size / 2;
  const outerRadius = 260;
  const zodiacRadius = 220;
  const aspectRadius = 150;
  const planetRadius = 180;
  const houseLabelRadius = 196;

  if (!chart) {
    return null;
  }

  return (
    <Card className="overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="natal-chart-wheel-card">
      <CardContent className="space-y-8 p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-primary" data-testid="natal-chart-wheel-eyebrow">Visual natal chart</p>
            <h3 className="mt-2 font-display text-4xl text-white" data-testid="natal-chart-wheel-title">A static wheel for planetary placements, houses, and aspect geometry.</h3>
          </div>
          <p className="max-w-md text-sm leading-7 text-slate-300" data-testid="natal-chart-wheel-description">
            This first version is intentionally clear and elegant: the zodiac ring, house cusps, and inner aspect lines are visible at a glance, with room to become interactive later.
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]" data-testid="natal-chart-wheel-layout">
          <div className="overflow-hidden border border-white/10 bg-black/25 p-4 md:p-6">
            <svg className="h-auto w-full" data-testid="natal-chart-wheel-svg" viewBox={`0 0 ${size} ${size}`}>
              <defs>
                <radialGradient id="wheelGlow" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="rgba(123,97,255,0.14)" />
                  <stop offset="100%" stopColor="rgba(5,5,8,0)" />
                </radialGradient>
              </defs>

              <circle cx={center} cy={center} fill="url(#wheelGlow)" r={outerRadius + 12} />
              <circle cx={center} cy={center} fill="none" r={outerRadius} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
              <circle cx={center} cy={center} fill="none" r={zodiacRadius} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <circle cx={center} cy={center} fill="none" r={aspectRadius + 26} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <circle cx={center} cy={center} fill="none" r={aspectRadius} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

              {Array.from({ length: 12 }).map((_, index) => {
                const angle = index * 30;
                const outer = polarPoint(center, center, outerRadius, angle);
                const inner = polarPoint(center, center, zodiacRadius, angle);
                const signPoint = polarPoint(center, center, (outerRadius + zodiacRadius) / 2, angle + 15);
                return (
                  <g key={`sign-${index}`} data-testid={`natal-chart-sign-${index}`}>
                    <line x1={outer.x} x2={inner.x} y1={outer.y} y2={inner.y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <text fill="rgba(226,232,240,0.92)" fontFamily="Playfair Display, serif" fontSize="24" textAnchor="middle" x={signPoint.x} y={signPoint.y}>{SIGN_LABELS[index]}</text>
                  </g>
                );
              })}

              {houseCusps.map((cusp, index) => {
                const start = polarPoint(center, center, zodiacRadius, cusp);
                const end = polarPoint(center, center, aspectRadius - 20, cusp);
                const next = houseCusps[(index + 1) % houseCusps.length];
                const labelPoint = polarPoint(center, center, houseLabelRadius, wrappedMidpoint(cusp, next));
                return (
                  <g key={`house-${index + 1}`} data-testid={`natal-chart-house-${index + 1}`}>
                    <line x1={start.x} x2={end.x} y1={start.y} y2={end.y} stroke="rgba(212,175,55,0.45)" strokeWidth="1.2" />
                    <text fill="rgba(212,175,55,0.86)" fontFamily="JetBrains Mono, monospace" fontSize="12" textAnchor="middle" x={labelPoint.x} y={labelPoint.y}>{index + 1}</text>
                  </g>
                );
              })}

              {aspects.map((aspect, index) => {
                const first = chart.placements[aspect.between[0]];
                const second = chart.placements[aspect.between[1]];
                if (!first || !second) return null;
                const start = polarPoint(center, center, aspectRadius, first.longitude);
                const end = polarPoint(center, center, aspectRadius, second.longitude);
                return (
                  <line
                    data-testid={`natal-chart-aspect-${index}`}
                    key={`${aspect.between.join("-")}-${index}`}
                    stroke={ASPECT_COLORS[aspect.type] || "rgba(255,255,255,0.26)"}
                    strokeWidth={aspect.type === "Conjunction" ? 1.5 : 1.1}
                    x1={start.x}
                    x2={end.x}
                    y1={start.y}
                    y2={end.y}
                  />
                );
              })}

              {placements.map((placement) => {
                const point = polarPoint(center, center, planetRadius, placement.longitude);
                return (
                  <g key={placement.name} data-testid={`natal-chart-placement-${placement.name.toLowerCase().replace(/\s+/g, "-")}`}>
                    <circle cx={point.x} cy={point.y} fill="#050508" r="14" stroke="rgba(212,175,55,0.75)" strokeWidth="1.2" />
                    <text fill="rgba(248,250,252,0.95)" fontFamily="JetBrains Mono, monospace" fontSize="10" textAnchor="middle" x={point.x} y={point.y + 3}>{PLANET_ABBREVIATIONS[placement.name] || placement.name.slice(0, 2)}</text>
                  </g>
                );
              })}

              <circle cx={center} cy={center} fill="#050508" r="18" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            </svg>
          </div>

          <div className="space-y-4" data-testid="natal-chart-wheel-sidebar">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {placements.map((placement) => (
                <div className="border border-white/10 bg-black/25 px-4 py-4" key={placement.name} data-testid={`natal-chart-legend-${placement.name.toLowerCase().replace(/\s+/g, "-")}`}>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{placement.name}</p>
                  <p className="mt-2 font-display text-2xl text-white">{placement.sign}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{formatPlacement(placement)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}