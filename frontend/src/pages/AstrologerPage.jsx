import { AstrologerChatPanel } from "@/components/common/AstrologerChatPanel";


export default function AstrologerPage() {
  return (
    <div className="space-y-8" data-testid="astrologer-page">
      <section className="space-y-4" data-testid="astrologer-page-header">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary" data-testid="astrologer-page-eyebrow">Chart-aware conversation</p>
        <h1 className="font-display text-5xl leading-[0.95] text-white md:text-6xl" data-testid="astrologer-page-title">Speak with the AI Astrologer in a dedicated reading room.</h1>
        <p className="max-w-4xl text-base leading-8 text-slate-300" data-testid="astrologer-page-description">
          This full-page conversation keeps the same session memory as the dashboard preview for the current visit. Ask about placements, aspects, transits, houses, or emotional themes and receive a psychologically grounded astrology response.
        </p>
      </section>

      <AstrologerChatPanel variant="page" />
    </div>
  );
}