import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { CircleX, LockKeyhole, MessageCircleHeart, RefreshCcw, SendHorizonal, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAstrologerChat } from "@/context/AstrologerChatContext";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";


export function AstrologerChatPanel({ variant = "dashboard" }) {
  const { user } = useAuth();
  const textareaRef = useRef(null);
  const {
    messages,
    loading,
    sending,
    eligible,
    currentTier,
    suggestedPrompts,
    composerDraft,
    activeFocus,
    focusSignal,
    setComposerDraft,
    clearActiveFocus,
    sendMessage,
    resetConversation,
  } = useAstrologerChat();
  const visibleMessages = useMemo(() => (variant === "dashboard" ? messages.slice(-4) : messages), [messages, variant]);

  useEffect(() => {
    if (!focusSignal) return;
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }, [focusSignal]);

  const startBlueprintCheckout = async () => {
    try {
      const response = await api.post("/billing/checkout/session", {
        tier: "blueprint",
        origin_url: window.location.origin,
      });
      window.location.href = response.data.url;
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Unable to start Blueprint checkout right now.");
    }
  };

  const handleSend = async () => {
    if (!composerDraft.trim() || sending) return;
    const prompt = composerDraft.trim();
    try {
      await sendMessage(prompt);
    } catch {
      setComposerDraft(prompt);
    }
  };

  const handlePrompt = (prompt) => {
    clearActiveFocus();
    setComposerDraft(prompt);
  };

  if (!eligible) {
    return (
      <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid={`astrologer-chat-panel-${variant}`}>
        <CardContent className="space-y-6 p-7">
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-5 w-5 text-primary" />
            <p className="text-[11px] uppercase tracking-[0.28em] text-primary" data-testid={`astrologer-locked-eyebrow-${variant}`}>AI Astrologer</p>
          </div>
          <div className="space-y-4">
            <h3 className="font-display text-4xl text-white" data-testid={`astrologer-locked-title-${variant}`}>A chart-aware astrologer opens at Blueprint and Master.</h3>
            <p className="max-w-3xl text-sm leading-8 text-slate-300" data-testid={`astrologer-locked-description-${variant}`}>
              This conversation layer is designed to feel like a reflective astrologer who already knows your natal chart. It becomes available once your account reaches Blueprint or Master access.
            </p>
            {activeFocus ? (
              <div className="border border-white/10 bg-black/25 px-4 py-4 text-sm leading-7 text-slate-100" data-testid={`astrologer-locked-focus-${variant}`}>
                Selected chart context: <span className="text-primary">{activeFocus.title}</span>. Unlock Blueprint to ask about this point directly.
              </div>
            ) : null}
            <div className="border border-primary/20 bg-primary/10 px-4 py-4 text-sm leading-7 text-slate-100" data-testid={`astrologer-locked-story-${variant}`}>
              Current access: <span className="text-primary">{currentTier}</span>. Blueprint opens chart-aware interpretation for placements, aspects, houses, and transits in conversation.
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="border border-primary/45 bg-primary px-5 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-primary/90" data-testid={`astrologer-unlock-blueprint-button-${variant}`} onClick={startBlueprintCheckout}>
              <Sparkles className="mr-2 h-4 w-4" />
              Unlock Blueprint
            </Button>
            {variant === "dashboard" ? (
              <Button asChild className="border border-white/10 bg-white/5 px-5 py-3 text-xs uppercase tracking-[0.24em] text-white hover:bg-white/10" data-testid={`astrologer-open-page-button-${variant}`} variant="ghost">
                <Link to="/astrologer">View full AI page</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid={`astrologer-chat-panel-${variant}`}>
      <CardContent className="space-y-6 p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-primary" data-testid={`astrologer-panel-eyebrow-${variant}`}>AI Astrologer</p>
            <h3 className="mt-2 font-display text-4xl text-white" data-testid={`astrologer-panel-title-${variant}`}>A reflective astrologer that already knows your chart.</h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300" data-testid={`astrologer-panel-description-${variant}`}>
              Session-only memory is active for this visit. Ask about placements, aspects, transits, houses, or the emotional themes moving through your chart right now.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {variant === "dashboard" ? (
              <Button asChild className="border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.24em] text-white hover:bg-white/10" data-testid={`astrologer-open-full-page-${variant}`} variant="ghost">
                <Link to="/astrologer">Open full chat</Link>
              </Button>
            ) : null}
            <Button className="border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.24em] text-white hover:bg-white/10" data-testid={`astrologer-reset-session-button-${variant}`} onClick={resetConversation} variant="ghost">
              <RefreshCcw className="mr-2 h-4 w-4" />
              New session
            </Button>
          </div>
        </div>

        {activeFocus ? (
          <div className="flex flex-wrap items-start justify-between gap-4 border border-primary/25 bg-primary/10 px-4 py-4" data-testid={`astrologer-active-focus-${variant}`}>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Interactive chart context</p>
              <p className="mt-2 font-display text-2xl text-white" data-testid={`astrologer-active-focus-title-${variant}`}>{activeFocus.title}</p>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-200" data-testid={`astrologer-active-focus-summary-${variant}`}>{activeFocus.summary}</p>
            </div>
            <Button className="border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.24em] text-white hover:bg-white/10" data-testid={`astrologer-clear-focus-button-${variant}`} onClick={clearActiveFocus} variant="ghost">
              <CircleX className="mr-2 h-4 w-4" />
              Clear context
            </Button>
          </div>
        ) : null}

        <div className={`overflow-y-auto border border-white/10 bg-black/25 p-4 ${variant === "dashboard" ? "max-h-[28rem]" : "min-h-[30rem] max-h-[40rem]"}`} data-testid={`astrologer-messages-${variant}`}>
          {loading ? (
            <p className="text-sm text-slate-400" data-testid={`astrologer-loading-${variant}`}>Loading your astrologer session…</p>
          ) : visibleMessages.length ? (
            <div className="space-y-4">
              {visibleMessages.map((message, index) => (
                <div
                  className={`max-w-[85%] space-y-2 border px-4 py-3 ${message.role === "assistant" ? "border-primary/20 bg-primary/10 text-slate-100" : "ml-auto border-white/10 bg-white/5 text-white"}`}
                  data-testid={`astrologer-message-${variant}-${index}`}
                  key={`${message.created_at}-${index}`}
                >
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{message.role === "assistant" ? "AI Astrologer" : user?.name || "You"}</p>
                  <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4" data-testid={`astrologer-empty-state-${variant}`}>
              <div className="flex items-center gap-3 text-primary">
                <MessageCircleHeart className="h-5 w-5" />
                <p className="text-[11px] uppercase tracking-[0.28em]">Suggested openings</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    className="border border-white/10 bg-white/5 px-4 py-4 text-left text-sm leading-7 text-slate-200 transition-colors hover:border-primary/40 hover:bg-primary/10"
                    data-testid={`astrologer-suggested-prompt-${variant}-${prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    key={prompt}
                    onClick={() => handlePrompt(prompt)}
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3" data-testid={`astrologer-input-area-${variant}`}>
          <Textarea
            className="min-h-[112px] border-white/10 bg-white/5 text-white placeholder:text-slate-500"
            data-testid={`astrologer-message-input-${variant}`}
            onChange={(event) => setComposerDraft(event.target.value)}
            placeholder="Ask about a placement, an aspect, a transit, or a recurring emotional theme in your chart…"
            ref={textareaRef}
            value={composerDraft}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-6 text-slate-500" data-testid={`astrologer-footnote-${variant}`}>{activeFocus ? "The selected chart point will be included as live context in the astrologer response." : "Designed as a chart-aware conversation, not a generic chatbot."}</p>
            <Button className="border border-primary/45 bg-primary px-5 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-primary/90" data-testid={`astrologer-send-button-${variant}`} disabled={!composerDraft.trim() || sending} onClick={handleSend}>
              <SendHorizonal className="mr-2 h-4 w-4" />
              {sending ? "Consulting chart…" : "Ask the astrologer"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}