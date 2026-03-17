import { useEffect, useState } from "react";
import { MapPin, PencilLine, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";


export function BirthChartEditor({ chart, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("12:00");
  const [birthTimeKnown, setBirthTimeKnown] = useState(true);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!chart) return;
    setBirthDate(chart.birth_date || "");
    setBirthTime(chart.birth_time || "12:00");
    setBirthTimeKnown(Boolean(chart.birth_time));
    setLocationQuery(chart.location_name || "");
    setSelectedLocation({
      id: "current-chart-location",
      label: chart.location_name,
      latitude: chart.latitude,
      longitude: chart.longitude,
      timezone: chart.timezone,
    });
  }, [chart]);

  const searchLocations = async () => {
    if (!locationQuery.trim()) {
      toast.error("Enter a location to search.");
      return;
    }
    setSearching(true);
    try {
      const response = await api.get("/locations/search", { params: { q: locationQuery } });
      setLocationResults(response.data.results);
      if (!response.data.results.length) {
        toast.error("No locations matched that search.");
      }
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Unable to search locations right now.");
    } finally {
      setSearching(false);
    }
  };

  const regenerateChart = async () => {
    if (!birthDate || !selectedLocation) {
      toast.error("Birth date and location are required to regenerate the chart.");
      return;
    }

    setSaving(true);
    try {
      const response = await api.put("/chart/current", {
        birth_date: birthDate,
        birth_time: birthTimeKnown ? `${birthTime}:00` : null,
        birth_time_known: birthTimeKnown,
        location_name: selectedLocation.label,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        timezone: selectedLocation.timezone,
      });
      toast.success("Your chart has been regenerated.");
      setIsEditing(false);
      onUpdated(response.data);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "We couldn't regenerate the chart yet.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="birth-chart-editor-card">
      <CardContent className="space-y-6 p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-primary" data-testid="birth-chart-editor-eyebrow">Chart editing</p>
            <h3 className="mt-2 font-display text-3xl text-white" data-testid="birth-chart-editor-title">Update birth details and regenerate the chart.</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300" data-testid="birth-chart-editor-description">
              This phase overwrites the current saved chart cleanly and regenerates every reading layer from the updated data.
            </p>
          </div>
          <Button className="border border-white/10 bg-white/5 px-5 py-3 text-xs uppercase tracking-[0.24em] text-white hover:bg-white/10" data-testid="birth-chart-editor-toggle-button" onClick={() => setIsEditing((open) => !open)} variant="ghost">
            <PencilLine className="mr-2 h-4 w-4" />
            {isEditing ? "Close editor" : "Edit chart data"}
          </Button>
        </div>

        {isEditing ? (
          <div className="space-y-6" data-testid="birth-chart-editor-form">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.24em] text-slate-400" htmlFor="editor-birth-date">Birth date</label>
                <Input className="h-12 border-white/10 bg-white/5 text-white" data-testid="editor-birth-date-input" id="editor-birth-date" onChange={(event) => setBirthDate(event.target.value)} type="date" value={birthDate} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.24em] text-slate-400" htmlFor="editor-birth-time">Birth time</label>
                <Input className="h-12 border-white/10 bg-white/5 text-white disabled:opacity-40" data-testid="editor-birth-time-input" disabled={!birthTimeKnown} id="editor-birth-time" onChange={(event) => setBirthTime(event.target.value)} type="time" value={birthTime} />
              </div>
            </div>

            <label className="flex items-center gap-3 border border-white/10 bg-black/25 px-4 py-4 text-sm text-slate-200" data-testid="editor-unknown-birth-time-toggle">
              <input checked={!birthTimeKnown} className="h-4 w-4 accent-[#D4AF37]" onChange={(event) => setBirthTimeKnown(!event.target.checked)} type="checkbox" />
              Birth time unknown — use 12:00 UT and mark ascendant and houses as approximate.
            </label>

            <div className="space-y-3">
              <label className="text-[11px] uppercase tracking-[0.24em] text-slate-400" htmlFor="editor-location-query">Birth location</label>
              <div className="flex flex-col gap-3 md:flex-row">
                <Input className="h-12 border-white/10 bg-white/5 text-white placeholder:text-slate-500" data-testid="editor-location-query-input" id="editor-location-query" onChange={(event) => setLocationQuery(event.target.value)} placeholder="Search city, state, country" value={locationQuery} />
                <Button className="border border-white/10 bg-white/5 px-6 py-3 text-xs uppercase tracking-[0.24em] text-white hover:bg-white/10" data-testid="editor-location-search-button" disabled={searching} onClick={searchLocations} type="button" variant="ghost">
                  <Search className="mr-2 h-4 w-4" />
                  {searching ? "Searching…" : "Search"}
                </Button>
              </div>
            </div>

            <div className="space-y-3" data-testid="editor-location-results-list">
              {locationResults.map((location) => {
                const selected = selectedLocation?.id === location.id;
                return (
                  <button
                    className={`flex w-full items-start gap-3 border px-4 py-4 text-left transition-colors ${selected ? "border-primary/50 bg-primary/10" : "border-white/10 bg-black/25 hover:border-white/20"}`}
                    data-testid={`editor-location-option-${location.id}`}
                    key={location.id}
                    onClick={() => setSelectedLocation(location)}
                    type="button"
                  >
                    <MapPin className="mt-1 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm leading-6 text-white">{location.label}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{location.timezone}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedLocation ? (
              <div className="border border-primary/20 bg-primary/10 px-4 py-4 text-sm leading-7 text-slate-100" data-testid="editor-selected-location-summary">
                Regenerating from: <span className="text-primary">{selectedLocation.label}</span> · {selectedLocation.timezone}
              </div>
            ) : null}

            <Button className="w-full border border-primary/50 bg-primary px-6 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-primary/90" data-testid="editor-regenerate-chart-button" disabled={saving} onClick={regenerateChart} type="button">
              <RefreshCw className="mr-2 h-4 w-4" />
              {saving ? "Regenerating…" : "Update & regenerate chart"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}