import { useMemo, useState } from "react";
import { Orbit, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
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
const HOUSE_TOPICS = {
  1: "identity, presence, and how you enter the world",
  2: "security, value, and resources",
  3: "mindset, language, and everyday perception",
  4: "roots, memory, and emotional foundations",
  5: "creativity, romance, and self-expression",
  6: "rituals, wellbeing, and the craft of daily life",
  7: "partnership, mirroring, and relational truth",
  8: "intimacy, transformation, and psychological depth",
  9: "meaning, faith, and worldview",
  10: "career, vocation, and public direction",
  11: "community, friendship, and future vision",
  12: "inner life, solitude, and the unconscious",
};


function polarPoint(cx, cy, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}


function wrappedMidpoint(start, end) {
  let adjustedEnd = end;
  if (adjustedEnd < start) adjustedEnd += 360;
  return (start + adjustedEnd) / 2 % 360;
}


function polarToCartesian(cx, cy, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}


function donutArcPath(cx, cy, innerRadius, outerRadius, startAngle, endAngle) {
  let adjustedEnd = endAngle;
  if (adjustedEnd <= startAngle) adjustedEnd += 360;
  const largeArcFlag = adjustedEnd - startAngle > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, adjustedEnd);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, adjustedEnd);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}


function formatPlacement(placement) {
  return `${placement.sign} · ${placement.degree}°${placement.house ? ` · House ${placement.house}` : ""}`;
}


function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}


function buildPlacementItem(placement) {
  return {
    id: `placement-${placement.name.toLowerCase().replace(/\s+/g, "-")}`,
    kind: "placement",
    title: `${placement.name} in ${placement.sign}`,
    summary: `${placement.name} sits in ${placement.sign} at ${placement.degree}°,${placement.house ? ` in House ${placement.house},` : ""} shaping this part of your chart through ${placement.sign}'s tone and symbolism.`,
    prompt: `Explain my ${placement.name} placement in ${placement.sign}${placement.house ? ` in House ${placement.house}` : ""}.`,
    placementName: placement.name,
    houseNumber: placement.house,
    relatedPlacementNames: [placement.name],
  };
}


function buildHouseItem(houseNumber, placements) {
  const names = placements.length ? placements.map((item) => item.name).join(", ") : "no major planets";
  return {
    id: `house-${houseNumber}`,
    kind: "house",
    title: `House ${houseNumber}`,
    summary: `House ${houseNumber} describes ${HOUSE_TOPICS[houseNumber]}. This part of your chart contains ${names}.`,
    prompt: `Explain House ${houseNumber} in my chart, especially the planets there.`,
    houseNumber,
    relatedPlacementNames: placements.map((item) => item.name),
  };
}


function buildAspectItem(aspect, index) {
  return {
    id: `aspect-${index}-${aspect.between.join("-").toLowerCase().replace(/\s+/g, "-")}`,
    kind: "aspect",
    title: `${aspect.between[0]} ${aspect.type} ${aspect.between[1]}`,
    summary: `${aspect.between[0]} forms a ${aspect.type.toLowerCase()} with ${aspect.between[1]} at an orb of ${aspect.orb}°, creating a live dialogue between those two chart factors.`,
    prompt: `Explain my ${aspect.between[0]} ${aspect.type.toLowerCase()} ${aspect.between[1]} aspect.`,
    relatedPlacementNames: aspect.between,
  };
}


export function NatalChartWheel({ chart, onExploreItem, astrologerEligible }) {
  const [selectedItem, setSelectedItem] = useState(null);
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

  const placementsByHouse = useMemo(() => {
    const grouped = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [index + 1, []]));
    placements.forEach((placement) => {
      if (placement.house) grouped[placement.house].push(placement);
    });
    return grouped;
  }, [placements]);

  const displayPositions = useMemo(() => {
    const sorted = [...placements].sort((first, second) => first.longitude - second.longitude);
    const groups = [];
    sorted.forEach((placement) => {
      const previousGroup = groups[groups.length - 1];
      if (!previousGroup) {
        groups.push([placement]);
        return;
      }
      const previousPlacement = previousGroup[previousGroup.length - 1];
      const longitudeGap = Math.abs(previousPlacement.longitude - placement.longitude);
      if (longitudeGap <= 7) {
        previousGroup.push(placement);
        return;
      }
      groups.push([placement]);
    });

    const positions = {};
    groups.forEach((group) => {
      if (group.length === 1) {
        positions[group[0].name] = {
          angle: group[0].longitude,
          radius: planetRadius,
        };
        return;
      }

      group.forEach((placement, index) => {
        const centeredIndex = index - (group.length - 1) / 2;
        const angleOffset = centeredIndex * 6;
        const radiusOffset = Math.abs(centeredIndex % 2) < 0.01 ? 0 : centeredIndex > 0 ? 18 : -18;
        positions[placement.name] = {
          angle: placement.longitude + angleOffset,
          radius: planetRadius + radiusOffset,
        };
      });
    });

    return positions;
  }, [placements, planetRadius]);

  const selectedHouseNumber = selectedItem?.kind === "house"
    ? selectedItem.houseNumber
    : selectedItem?.kind === "placement"
      ? selectedItem.houseNumber
      : null;
  const highlightedPlacements = new Set(selectedItem?.relatedPlacementNames || []);

  const labelPosition = useMemo(() => {
    if (!selectedItem) return null;
    if (selectedItem.kind === "placement") {
      const placement = chart.placements[selectedItem.placementName];
      const displayPlacement = displayPositions[selectedItem.placementName] || { angle: placement.longitude, radius: planetRadius };
      return polarPoint(center, center, displayPlacement.radius + 34, displayPlacement.angle);
    }
    if (selectedItem.kind === "house") {
      const cusp = houseCusps[selectedItem.houseNumber - 1];
      const next = houseCusps[selectedItem.houseNumber % 12];
      return polarPoint(center, center, houseLabelRadius + 28, wrappedMidpoint(cusp, next));
    }
    const aspectIndex = aspects.findIndex((aspect, index) => buildAspectItem(aspect, index).id === selectedItem.id);
    if (aspectIndex >= 0) {
      const aspect = aspects[aspectIndex];
      const first = chart.placements[aspect.between[0]];
      const second = chart.placements[aspect.between[1]];
      const start = polarPoint(center, center, aspectRadius, first.longitude);
      const end = polarPoint(center, center, aspectRadius, second.longitude);
      return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 12 };
    }
    return null;
  }, [aspectRadius, aspects, center, chart?.placements, displayPositions, houseCusps, houseLabelRadius, planetRadius, selectedItem]);

  const handleSelect = (item) => {
    setSelectedItem(item);
    if (!isMobileViewport()) {
      onExploreItem?.(item, { target: "dashboard-panel" });
    }
  };

  const handleAsk = () => {
    if (!selectedItem) return;
    onExploreItem?.(selectedItem, { target: isMobileViewport() ? "dedicated-page" : "dashboard-panel" });
  };

  if (!chart) {
    return null;
  }

  return (
    <Card className="overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="natal-chart-wheel-card">
      <CardContent className="space-y-8 p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-primary" data-testid="natal-chart-wheel-eyebrow">Visual natal chart</p>
            <h3 className="mt-2 font-display text-4xl text-white" data-testid="natal-chart-wheel-title">An interactive wheel for placements, houses, and aspect geometry.</h3>
          </div>
          <p className="max-w-md text-sm leading-7 text-slate-300" data-testid="natal-chart-wheel-description">
            Tap or click the chart to inspect planets, houses, and aspects. On desktop the astrologer panel opens smoothly below; on mobile you get a detail card with a quick ask action.
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]" data-testid="natal-chart-wheel-layout">
          <div className="overflow-hidden border border-white/10 bg-black/25 p-4 md:p-6">
            <div className="relative mx-auto max-w-[680px]" data-testid="natal-chart-wheel-interaction-layer">
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

              {houseCusps.map((cusp, index) => {
                const next = houseCusps[(index + 1) % houseCusps.length];
                return (
                  <path
                    d={donutArcPath(center, center, aspectRadius + 26, zodiacRadius, cusp, next)}
                    data-testid={`natal-chart-house-sector-${index + 1}`}
                    fill={selectedHouseNumber === index + 1 ? "rgba(212,175,55,0.12)" : "transparent"}
                    key={`house-sector-${index + 1}`}
                    onClick={() => handleSelect(buildHouseItem(index + 1, placementsByHouse[index + 1]))}
                    style={{ cursor: "pointer" }}
                  />
                );
              })}

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
                  <g key={`house-${index + 1}`} data-testid={`natal-chart-house-${index + 1}`} onClick={() => handleSelect(buildHouseItem(index + 1, placementsByHouse[index + 1]))} style={{ cursor: "pointer" }}>
                    <line x1={start.x} x2={end.x} y1={start.y} y2={end.y} stroke={selectedHouseNumber === index + 1 ? "rgba(212,175,55,0.95)" : "rgba(212,175,55,0.45)"} strokeWidth={selectedHouseNumber === index + 1 ? "2.3" : "1.2"} />
                    <text fill={selectedHouseNumber === index + 1 ? "rgba(255,255,255,0.98)" : "rgba(212,175,55,0.86)"} fontFamily="JetBrains Mono, monospace" fontSize="12" textAnchor="middle" x={labelPoint.x} y={labelPoint.y}>{index + 1}</text>
                  </g>
                );
              })}

              {aspects.map((aspect, index) => {
                const first = chart.placements[aspect.between[0]];
                const second = chart.placements[aspect.between[1]];
                if (!first || !second) return null;
                const start = polarPoint(center, center, aspectRadius, first.longitude);
                const end = polarPoint(center, center, aspectRadius, second.longitude);
                const aspectItem = buildAspectItem(aspect, index);
                const selected = selectedItem?.id === aspectItem.id;
                return (
                  <g key={`${aspect.between.join("-")}-${index}`}>
                    <line
                      data-testid={`natal-chart-aspect-${index}`}
                      stroke={selected ? "rgba(255,255,255,0.96)" : ASPECT_COLORS[aspect.type] || "rgba(255,255,255,0.26)"}
                      strokeWidth={selected ? 2.8 : aspect.type === "Conjunction" ? 1.5 : 1.1}
                      x1={start.x}
                      x2={end.x}
                      y1={start.y}
                      y2={end.y}
                    />
                    <line
                      data-testid={`natal-chart-aspect-hitarea-${index}`}
                      onClick={() => handleSelect(aspectItem)}
                      stroke="transparent"
                      strokeWidth="14"
                      style={{ cursor: "pointer" }}
                      x1={start.x}
                      x2={end.x}
                      y1={start.y}
                      y2={end.y}
                    />
                  </g>
                );
              })}

              {placements.map((placement) => {
                const displayPlacement = displayPositions[placement.name] || { angle: placement.longitude, radius: planetRadius };
                const point = polarPoint(center, center, displayPlacement.radius, displayPlacement.angle);
                const selected = selectedItem?.kind === "placement" && selectedItem.placementName === placement.name;
                const aspectRelated = selectedItem?.kind === "aspect" && highlightedPlacements.has(placement.name);
                return (
                  <g key={placement.name} style={{ cursor: "pointer" }}>
                    {selected || aspectRelated ? <circle cx={point.x} cy={point.y} fill="none" r="20" stroke="rgba(255,255,255,0.95)" strokeWidth="1.7" /> : null}
                    <circle cx={point.x} cy={point.y} fill={selected ? "rgba(212,175,55,0.18)" : "#050508"} r="14" stroke={selected || aspectRelated ? "rgba(255,255,255,0.98)" : "rgba(212,175,55,0.75)"} strokeWidth={selected || aspectRelated ? "1.8" : "1.2"} />
                    <text fill="rgba(248,250,252,0.95)" fontFamily="JetBrains Mono, monospace" fontSize="10" pointerEvents="none" textAnchor="middle" x={point.x} y={point.y + 3}>{PLANET_ABBREVIATIONS[placement.name] || placement.name.slice(0, 2)}</text>
                  </g>
                );
              })}

              {labelPosition && selectedItem ? (
                <g data-testid="natal-chart-selected-label">
                  <rect fill="rgba(5,5,8,0.92)" height="32" rx="6" stroke="rgba(212,175,55,0.7)" width={Math.max(132, selectedItem.title.length * 6.8)} x={labelPosition.x - Math.max(132, selectedItem.title.length * 6.8) / 2} y={labelPosition.y - 24} />
                  <text fill="rgba(255,255,255,0.96)" fontFamily="JetBrains Mono, monospace" fontSize="11" textAnchor="middle" x={labelPosition.x} y={labelPosition.y - 4}>{selectedItem.title}</text>
                </g>
              ) : null}

              <circle cx={center} cy={center} fill="#050508" r="18" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            </svg>

            <div className="pointer-events-none absolute inset-0" data-testid="natal-chart-placement-hitareas">
              {placements.map((placement) => {
                const displayPlacement = displayPositions[placement.name] || { angle: placement.longitude, radius: planetRadius };
                const point = polarPoint(center, center, displayPlacement.radius, displayPlacement.angle);
                const selected = selectedItem?.kind === "placement" && selectedItem.placementName === placement.name;
                return (
                  <button
                    aria-label={`Open ${placement.name} placement`}
                    className={`pointer-events-auto absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full ${selected ? "ring-2 ring-white/80" : ""}`}
                    data-testid={`natal-chart-placement-${placement.name.toLowerCase().replace(/\s+/g, "-")}`}
                    key={`placement-hitarea-${placement.name}`}
                    onClick={() => handleSelect(buildPlacementItem(placement))}
                    style={{ left: `${(point.x / size) * 100}%`, top: `${(point.y / size) * 100}%` }}
                    type="button"
                  >
                    <span className="sr-only">{placement.name}</span>
                  </button>
                );
              })}
            </div>
            </div>

            {selectedItem ? (
              <div className="mt-5 border border-primary/25 bg-primary/10 p-4" data-testid="natal-chart-selected-detail-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Selected chart point</p>
                    <h4 className="mt-2 font-display text-3xl text-white" data-testid="natal-chart-selected-detail-title">{selectedItem.title}</h4>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-200" data-testid="natal-chart-selected-detail-summary">{selectedItem.summary}</p>
                  </div>
                  <Button className="border border-primary/45 bg-primary px-5 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-primary/90" data-testid="natal-chart-ask-astrologer-button" onClick={handleAsk}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {astrologerEligible ? "Ask the astrologer" : "Open astrologer"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4" data-testid="natal-chart-wheel-sidebar">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {placements.map((placement) => (
                <button className="border border-white/10 bg-black/25 px-4 py-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/10" key={placement.name} data-testid={`natal-chart-legend-${placement.name.toLowerCase().replace(/\s+/g, "-")}`} onClick={() => handleSelect(buildPlacementItem(placement))} type="button">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{placement.name}</p>
                  <p className="mt-2 font-display text-2xl text-white">{placement.sign}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{formatPlacement(placement)}</p>
                </button>
              ))}
            </div>

            <div className="border border-white/10 bg-black/25 p-4" data-testid="natal-chart-aspect-list">
              <div className="flex items-center gap-3">
                <Orbit className="h-4 w-4 text-primary" />
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Clickable aspects</p>
              </div>
              <div className="mt-4 grid gap-3">
                {aspects.slice(0, 6).map((aspect, index) => {
                  const aspectItem = buildAspectItem(aspect, index);
                  return (
                    <button className="border border-white/10 bg-white/5 px-4 py-3 text-left text-sm leading-7 text-slate-200 transition-colors hover:border-primary/40 hover:bg-primary/10" data-testid={`natal-chart-aspect-chip-${index}`} key={aspectItem.id} onClick={() => handleSelect(aspectItem)} type="button">
                      {aspectItem.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}