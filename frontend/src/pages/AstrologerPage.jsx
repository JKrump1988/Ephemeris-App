import { Clock3, MessageSquareHeart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AstrologerChatPanel } from "@/components/common/AstrologerChatPanel";
import { useAstrologerChat } from "@/context/AstrologerChatContext";


export default function AstrologerPage() {
  const { history, historyLoading, loadSession, resetConversation, sessionId } = useAstrologerChat();

  return (
    <div className="space-y-8" data-testid="astrologer-page">
      <section className="space-y-4" data-testid="astrologer-page-header">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary" data-testid="astrologer-page-eyebrow">Chart-aware conversation</p>
        <h1 className="font-display text-5xl leading-[0.95] text-white md:text-6xl" data-testid="astrologer-page-title">Speak with the AI Astrologer in a dedicated reading room.</h1>
        <p className="max-w-4xl text-base leading-8 text-slate-300" data-testid="astrologer-page-description">
          This full-page conversation keeps the same live session as the dashboard preview, and your completed chats now save to your account so you can revisit earlier chart threads whenever you want.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]" data-testid="astrologer-page-layout">
        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="astrologer-history-card">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Saved chart conversations</p>
                <h2 className="mt-2 font-display text-3xl text-white">Return to past readings.</h2>
              </div>
              <Button className="border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.24em] text-white hover:bg-white/10" data-testid="astrologer-history-new-session-button" onClick={resetConversation} variant="ghost">
                New session
              </Button>
            </div>

            {historyLoading ? (
              <p className="text-sm text-slate-400" data-testid="astrologer-history-loading-state">Loading saved conversations…</p>
            ) : history.length ? (
              <div className="space-y-3" data-testid="astrologer-history-list">
                {history.map((item) => (
                  <button
                    className={`w-full border px-4 py-4 text-left transition-colors ${sessionId === item.session_id ? "border-primary/40 bg-primary/10" : "border-white/10 bg-black/25 hover:border-primary/30 hover:bg-white/5"}`}
                    data-testid={`astrologer-history-item-${item.session_id}`}
                    key={item.session_id}
                    onClick={() => loadSession(item.session_id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-2xl text-white">{item.title}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-300">{item.preview}</p>
                      </div>
                      <MessageSquareHeart className="mt-1 h-4 w-4 text-primary" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      <span>{item.message_count} messages</span>
                      {item.last_focus_title ? <span>{item.last_focus_title}</span> : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="border border-white/10 bg-black/25 px-4 py-5 text-sm leading-7 text-slate-300" data-testid="astrologer-history-empty-state">
                No saved astrologer conversations yet. Start a chart-aware reading and it will appear here.
              </div>
            )}

            <div className="border border-white/10 bg-black/25 px-4 py-4 text-sm leading-7 text-slate-300" data-testid="astrologer-history-note">
              <div className="flex items-center gap-3 text-primary">
                <Clock3 className="h-4 w-4" />
                <span className="text-[11px] uppercase tracking-[0.22em]">Saved to account</span>
              </div>
              <p className="mt-3">Each astrologer thread now stays attached to your account, so you can resume different lines of inquiry instead of losing the conversation when you leave the page.</p>
            </div>
          </CardContent>
        </Card>

        <AstrologerChatPanel variant="page" />
      </div>
    </div>
  );
}