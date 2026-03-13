import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";


const AstrologerChatContext = createContext(null);


function makeSessionId() {
  if (window.crypto?.randomUUID) {
    return `ai-${window.crypto.randomUUID()}`;
  }
  return `ai-${Date.now()}`;
}


function keysForUser(userId) {
  return {
    sessionId: `ephemeral-ai-session-id:${userId}`,
    messages: `ephemeral-ai-session-messages:${userId}`,
    draft: `ephemeral-ai-session-draft:${userId}`,
    focus: `ephemeral-ai-session-focus:${userId}`,
  };
}


export function AstrologerChatProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [composerDraft, setComposerDraftState] = useState("");
  const [activeFocus, setActiveFocus] = useState(null);
  const [focusSignal, setFocusSignal] = useState(0);

  const eligible = useMemo(() => ["blueprint", "master"].includes(user?.subscription_tier), [user]);

  const persistMessages = useCallback((nextMessages) => {
    if (!user?.id) return;
    const storageKeys = keysForUser(user.id);
    sessionStorage.setItem(storageKeys.messages, JSON.stringify(nextMessages));
    setMessages(nextMessages);
  }, [user]);

  const setComposerDraft = useCallback((nextDraft) => {
    setComposerDraftState(nextDraft);
    if (!user?.id) return;
    sessionStorage.setItem(keysForUser(user.id).draft, nextDraft);
  }, [user]);

  const persistActiveFocus = useCallback((nextFocus) => {
    setActiveFocus(nextFocus);
    if (!user?.id) return;
    const storageKeys = keysForUser(user.id);
    if (nextFocus) {
      sessionStorage.setItem(storageKeys.focus, JSON.stringify(nextFocus));
      return;
    }
    sessionStorage.removeItem(storageKeys.focus);
  }, [user]);

  const initialiseSession = useCallback(async () => {
    if (!user?.id || !isAuthenticated) return;
    const storageKeys = keysForUser(user.id);
    const existingSessionId = sessionStorage.getItem(storageKeys.sessionId) || makeSessionId();
    sessionStorage.setItem(storageKeys.sessionId, existingSessionId);
    setSessionId(existingSessionId);

    const storedMessages = sessionStorage.getItem(storageKeys.messages);
    const storedDraft = sessionStorage.getItem(storageKeys.draft);
    const storedFocus = sessionStorage.getItem(storageKeys.focus);

    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }

    setComposerDraftState(storedDraft || "");
    if (storedFocus) {
      try {
        setActiveFocus(JSON.parse(storedFocus));
      } catch {
        setActiveFocus(null);
      }
    } else {
      setActiveFocus(null);
    }

    setLoading(true);
    try {
      const response = await api.get(`/ai-astrologer/session/${existingSessionId}`);
      setSuggestedPrompts(response.data.suggested_prompts || []);
      if (!storedMessages) {
        persistMessages(response.data.messages || []);
      }
    } catch {
      setSuggestedPrompts([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, persistMessages, user]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setSessionId(null);
      setMessages([]);
      setSuggestedPrompts([]);
      setComposerDraftState("");
      setActiveFocus(null);
      return;
    }
    initialiseSession();
  }, [initialiseSession, isAuthenticated, user]);

  const clearActiveFocus = useCallback(() => {
    persistActiveFocus(null);
  }, [persistActiveFocus]);

  const resetConversation = useCallback(async () => {
    if (!user?.id) return;
    const storageKeys = keysForUser(user.id);
    const nextSessionId = makeSessionId();
    sessionStorage.setItem(storageKeys.sessionId, nextSessionId);
    sessionStorage.removeItem(storageKeys.messages);
    sessionStorage.removeItem(storageKeys.draft);
    sessionStorage.removeItem(storageKeys.focus);
    setSessionId(nextSessionId);
    setMessages([]);
    setComposerDraftState("");
    setActiveFocus(null);
    setLoading(true);
    try {
      const response = await api.get(`/ai-astrologer/session/${nextSessionId}`);
      setSuggestedPrompts(response.data.suggested_prompts || []);
    } catch {
      setSuggestedPrompts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const primeChartQuestion = useCallback((focusItem) => {
    persistActiveFocus(focusItem);
    setComposerDraft(focusItem?.prompt || "");
    setFocusSignal((current) => current + 1);
  }, [persistActiveFocus, setComposerDraft]);

  const sendMessage = useCallback(async (message, focusContext = activeFocus) => {
    if (!sessionId) return;
    if (!eligible) {
      toast.error("AI Astrologer opens at Blueprint and Master tiers.");
      return;
    }

    setSending(true);
    try {
      const response = await api.post("/ai-astrologer/message", {
        session_id: sessionId,
        message,
        focus_context: focusContext,
      });
      persistMessages(response.data.messages || []);
      setComposerDraft("");
      clearActiveFocus();
      return response.data;
    } catch (error) {
      toast.error(error?.response?.data?.detail || "The astrologer could not answer right now.");
      throw error;
    } finally {
      setSending(false);
    }
  }, [activeFocus, clearActiveFocus, eligible, persistMessages, sessionId, setComposerDraft]);

  const value = useMemo(() => ({
    sessionId,
    messages,
    loading,
    sending,
    eligible,
    currentTier: user?.subscription_tier,
    suggestedPrompts,
    composerDraft,
    activeFocus,
    focusSignal,
    setComposerDraft,
    clearActiveFocus,
    primeChartQuestion,
    sendMessage,
    resetConversation,
  }), [activeFocus, clearActiveFocus, composerDraft, eligible, focusSignal, loading, messages, primeChartQuestion, resetConversation, sendMessage, sending, sessionId, setComposerDraft, suggestedPrompts, user]);

  return <AstrologerChatContext.Provider value={value}>{children}</AstrologerChatContext.Provider>;
}


export function useAstrologerChat() {
  const context = useContext(AstrologerChatContext);
  if (!context) {
    throw new Error("useAstrologerChat must be used inside AstrologerChatProvider");
  }
  return context;
}