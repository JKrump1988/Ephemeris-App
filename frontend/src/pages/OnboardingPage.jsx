import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";


export default function OnboardingPage() {
  const navigate = useNavigate();
  const { markHasChart } = useAuth();
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("12:00");
  const [birthTimeKnown, setBirthTimeKnown] = useState(true);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchLocations = async () => {
    if (!locationQuery.trim()) {
      toast.error("Enter a birth location to search.");
      return;
    }

    setSearching(true);
    try {
      const response = await api.get("/locations/search", { params: { q: locationQuery } });
      setLocationResults(response.data.results);
      if (!response.data.results.length) {
        toast.error("No matching birth locations were found.");
      }
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Unable to search locations right now.");
    } finally {
      setSearching(false);
    }
  };

  const saveChart = async () => {
    if (!birthDate || !selectedLocation) {
      toast.error("Birth date and a selected location are required.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/chart", {
        birth_date: birthDate,
        birth_time: birthTimeKnown ? birthTime : null,
        birth_time_known: birthTimeKnown,
        location_name: selectedLocation.label,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        timezone: selectedLocation.timezone,
      });
      markHasChart();
      toast.success("Your chart has been calculated.");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.detail || "We couldn't calculate your chart yet.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]" data-testid="onboarding-page">
      <div className="space-y-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary" data-testid="onboarding-eyebrow">Chart intake</p>
        <h1 className="font-display text-5xl leading-[0.96] text-white md:text-6xl" data-testid="onboarding-title">Enter the sky coordinates of your story.</h1>
        <p className="max-w-xl text-base leading-8 text-slate-300" data-testid="onboarding-description">
          Ephemeral uses your birth date, time, and location to calculate a natal chart from astronomical ephemeris logic. If your birth time is unknown, the system uses 12:00 UT and clearly marks house and rising placements as approximate.
        </p>
      </div>

      <Card className="border border-white/10 bg-white/5 shadow-[0_35px_110px_rgba(0,0,0,0.42)] backdrop-blur-xl" data-testid="onboarding-form-card">
        <CardContent className="space-y-6 p-7 md:p-9">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[0.24em] text-slate-400" htmlFor="birth-date">Birth date</label>
              <Input className="h-12 border-white/10 bg-white/5 text-white" data-testid="birth-date-input" id="birth-date" onChange={(event) => setBirthDate(event.target.value)} type="date" value={birthDate} />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[0.24em] text-slate-400" htmlFor="birth-time">Birth time</label>
              <Input className="h-12 border-white/10 bg-white/5 text-white disabled:opacity-40" data-testid="birth-time-input" disabled={!birthTimeKnown} id="birth-time" onChange={(event) => setBirthTime(event.target.value)} type="time" value={birthTime} />
            </div>
          </div>

          <label className="flex items-center gap-3 border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200" data-testid="unknown-birth-time-toggle">
            <input checked={!birthTimeKnown} className="h-4 w-4 accent-[#D4AF37]" onChange={(event) => setBirthTimeKnown(!event.target.checked)} type="checkbox" />
            I don't know my birth time — use 12:00 UT and mark ascendant/houses as approximate.
          </label>

          <div className="space-y-3">
            <label className="text-[11px] uppercase tracking-[0.24em] text-slate-400" htmlFor="location-query">Birth location</label>
            <div className="flex flex-col gap-3 md:flex-row">
              <Input className="h-12 border-white/10 bg-white/5 text-white placeholder:text-slate-500" data-testid="location-query-input" id="location-query" onChange={(event) => setLocationQuery(event.target.value)} placeholder="Search city, state, country" value={locationQuery} />
              <Button className="border border-white/10 bg-white/5 px-6 py-3 text-xs uppercase tracking-[0.24em] text-white hover:bg-white/10" data-testid="location-search-button" disabled={searching} onClick={searchLocations} type="button" variant="ghost">
                <Search className="mr-2 h-4 w-4" />
                {searching ? "Searching…" : "Search"}
              </Button>
            </div>
          </div>

          <div className="space-y-3" data-testid="location-results-list">
            {locationResults.map((location) => {
              const selected = selectedLocation?.id === location.id;
              return (
                <button
                  className={`flex w-full items-start gap-3 border px-4 py-4 text-left transition-colors ${selected ? "border-primary/50 bg-primary/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}
                  data-testid={`location-option-${location.id}`}
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
            <div className="border border-primary/25 bg-primary/10 px-4 py-4 text-sm leading-7 text-slate-100" data-testid="selected-location-summary">
              Selected: <span className="text-primary">{selectedLocation.label}</span> · {selectedLocation.timezone}
            </div>
          ) : null}

          <Button className="w-full border border-primary/40 bg-primary px-6 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-primary/90" data-testid="calculate-chart-button" disabled={saving} onClick={saveChart} type="button">
            {saving ? "Calculating chart…" : "Generate Ephemeral reading"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}