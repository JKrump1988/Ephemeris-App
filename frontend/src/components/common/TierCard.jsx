import { LockKeyhole, Orbit, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";


function formatPrice(amount, currency) {
  if (!amount || !currency) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount);
}


export function TierCard({ tier, label, accessible, teaser, includedTopics, active, onOpen, amount, currency, premiumStory, onUnlock }) {
  const priceLabel = formatPrice(amount, currency);

  return (
    <Card
      className={cn(
        "border border-white/10 bg-white/5 shadow-[0_25px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1",
        active && "border-primary/50 bg-primary/8",
      )}
      data-testid={`tier-card-${tier}`}
    >
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400" data-testid={`tier-card-${tier}-eyebrow`}>Reading tier</p>
            <h3 className="mt-2 font-display text-3xl text-white" data-testid={`tier-card-${tier}-title`}>{label}</h3>
          </div>
          <Badge
            className={cn(
              "border px-3 py-1 text-[11px] uppercase tracking-[0.24em]",
              accessible ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/5 text-slate-300",
            )}
            variant="outline"
            data-testid={`tier-card-${tier}-access-badge`}
          >
            {accessible ? "Available" : "Locked"}
          </Badge>
        </div>

        <p className="text-sm leading-7 text-slate-300" data-testid={`tier-card-${tier}-teaser`}>{premiumStory || teaser}</p>

        {!accessible && priceLabel ? (
          <div className="border border-primary/20 bg-primary/10 px-4 py-4" data-testid={`tier-card-${tier}-price-panel`}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Progressive unlock</p>
            <p className="mt-2 font-display text-3xl text-white" data-testid={`tier-card-${tier}-price`}>{priceLabel}</p>
            <p className="mt-2 text-sm leading-7 text-slate-300">Buying {label} includes every tier beneath it in the Ephemeral reading ladder.</p>
          </div>
        ) : null}

        <div className="space-y-3" data-testid={`tier-card-${tier}-topics`}>
          {includedTopics.map((topic) => (
            <div className="flex items-start gap-3 text-sm text-slate-200" key={topic}>
              <Orbit className="mt-0.5 h-4 w-4 text-primary" />
              <span>{topic}</span>
            </div>
          ))}
        </div>

        <Button
          className="w-full border border-white/15 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.26em] text-white hover:border-primary/50 hover:bg-white/10"
          onClick={onOpen}
          data-testid={`tier-card-${tier}-open-button`}
          variant="ghost"
        >
          {accessible ? <Sparkles className="mr-2 h-4 w-4" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
          {accessible ? `Open ${label}` : `Preview ${label}`}
        </Button>

        {!accessible && onUnlock ? (
          <Button
            className="w-full border border-primary/45 bg-primary px-4 py-3 text-xs uppercase tracking-[0.26em] text-black hover:bg-primary/90"
            data-testid={`tier-card-${tier}-unlock-button`}
            onClick={onUnlock}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Unlock {label}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}