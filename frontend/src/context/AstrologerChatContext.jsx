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
    activeSessionId: `ephemeral-ai-active-session-id:${userId}`,
    draft: `ephemeral-ai-session-draft:${userId}`,
    focus: `ephemeral-ai-session-focus:${userId}`,
  };
}


export function AstrologerChatProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [sessionId, setSessionId] = useState(null);
  const [sessionTitle, setSessionTitle] = useState("New chart conversation");
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [composerDraft, setComposerDraftState] = useState("");
  const [activeFocus, setActiveFocus] = useState(null);
  const [focusSignal, setFocusSignal] = useState(0);

  const eligible = useMemo(() => ["blueprint", "master"].includes(user?.subscription_tier), [user]);

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

  const clearActiveFocus = useCallback(() => {
    persistActiveFocus(null);
  }, [persistActiveFocus]);

  const refreshHistory = useCallback(async () => {
    if (!user?.id || !eligible) {
      setHistory([]);
      return [];
    }
    setHistoryLoading(true);
    try {
      const response = await api.get("/ai-astrologer/sessions");
      const sessions = response.data.sessions || [];
      setHistory(sessions);
      return sessions;
    } catch {
      setHistory([]);
      return [];
    } finally {
      setHistoryLoading(false);
    }
  }, [eligible, user]);

  const loadSession = useCallback(async (nextSessionId) => {
    if (!user?.id || !eligible) return;
    const storageKeys = keysForUser(user.id);
    setLoading(true);
    try {
      const response = await api.get(`/ai-astrologer/session/${nextSessionId}`);
      localStorage.setItem(storageKeys.activeSessionId, nextSessionId);
      setSessionId(nextSessionId);
      setSessionTitle(response.data.title || "New chart conversation");
      setMessages(response.data.messages || []);
      setSuggestedPrompts(response.data.suggested_prompts || []);
      return response.data;
    } finally {
      setLoading(false);
    }
  }, [eligible, user]);

  const initialiseSession = useCallback(async () => {
    if (!user?.id || !isAuthenticated) return;
    const storageKeys = keysForUser(user.id);
    const storedDraft = sessionStorage.getItem(storageKeys.draft);
    const storedFocus = sessionStorage.getItem(storageKeys.focus);
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

    if (!eligible) {
      setSessionId(null);
      setSessionTitle("New chart conversation");
      setMessages([]);
      setSuggestedPrompts([]);
      setHistory([]);
      return;
    }

    const sessions = await refreshHistory();
    const preferredSessionId = localStorage.getItem(storageKeys.activeSessionId);
    const historyHasPreferred = sessions.some((item) => item.session_id === preferredSessionId);
    const nextSessionId = historyHasPreferred
      ? preferredSessionId
      : sessions[0]?.session_id || makeSessionId();

    await loadSession(nextSessionId);
  }, [eligible, isAuthenticated, loadSession, refreshHistory, user]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setSessionId(null);
      setSessionTitle("New chart conversation");
      setMessages([]);
      setHistory([]);
      setSuggestedPrompts([]);
      setComposerDraftState("");
      setActiveFocus(null);
      return;
    }
    initialiseSession();
  }, [initialiseSession, isAuthenticated, user]);

  const resetConversation = useCallback(async () => {
    if (!user?.id || !eligible) return;
    const storageKeys = keysForUser(user.id);
    const nextSessionId = makeSessionId();
    localStorage.setItem(storageKeys.activeSessionId, nextSessionId);
    sessionStorage.removeItem(storageKeys.draft);
    sessionStorage.removeItem(storageKeys.focus);
    setComposerDraftState("");
    setActiveFocus(null);
    setSessionId(nextSessionId);
    setSessionTitle("New chart conversation");
    setMessages([]);
    await loadSession(nextSessionId);
  }, [eligible, loadSession, user]);

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
      setMessages(response.data.messages || []);
      setSessionTitle(response.data.title || sessionTitle);
      setComposerDraft("");
      clearActiveFocus();
      await refreshHistory();
      return response.data;
    } catch (error) {
      toast.error(error?.response?.data?.detail || "The astrologer could not answer right now.");
      throw error;
    } finally {
      setSending(false);
    }
  }, [activeFocus, clearActiveFocus, eligible, refreshHistory, sessionId, sessionTitle, setComposerDraft]);

  const value = useMemo(() => ({
    sessionId,
    sessionTitle,
    messages,
    history,
    loading,
    historyLoading,
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
    loadSession,
    refreshHistory,
    sendMessage,
    resetConversation,
  }), [activeFocus, clearActiveFocus, composerDraft, eligible, focusSignal, history, historyLoading, loadSession, loading, messages, primeChartQuestion, refreshHistory, resetConversation, sendMessage, sending, sessionId, sessionTitle, setComposerDraft, suggestedPrompts, user]);

  return <AstrologerChatContext.Provider value={value}>{children}</AstrologerChatContext.Provider>;
}


export function useAstrologerChat() {
  const context = useContext(AstrologerChatContext);
  if (!context) {
    throw new Error("useAstrologerChat must be used inside AstrologerChatProvider");
  }
  return context;
}