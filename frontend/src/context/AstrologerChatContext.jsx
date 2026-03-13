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
  };
}


export function AstrologerChatProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const eligible = useMemo(() => ["blueprint", "master"].includes(user?.subscription_tier), [user]);

  const persistMessages = useCallback((nextMessages) => {
    if (!user?.id) return;
    const storageKeys = keysForUser(user.id);
    sessionStorage.setItem(storageKeys.messages, JSON.stringify(nextMessages));
    setMessages(nextMessages);
  }, [user]);

  const initialiseSession = useCallback(async () => {
    if (!user?.id || !isAuthenticated) return;
    const storageKeys = keysForUser(user.id);
    const existingSessionId = sessionStorage.getItem(storageKeys.sessionId) || makeSessionId();
    sessionStorage.setItem(storageKeys.sessionId, existingSessionId);
    setSessionId(existingSessionId);

    const storedMessages = sessionStorage.getItem(storageKeys.messages);
    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch {
        setMessages([]);
      }
    } else {
      setMessages([]);
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
      return;
    }
    initialiseSession();
  }, [initialiseSession, isAuthenticated, user]);

  const resetConversation = useCallback(async () => {
    if (!user?.id) return;
    const storageKeys = keysForUser(user.id);
    const nextSessionId = makeSessionId();
    sessionStorage.setItem(storageKeys.sessionId, nextSessionId);
    sessionStorage.removeItem(storageKeys.messages);
    setSessionId(nextSessionId);
    setMessages([]);
    setLoading(true);
    try {
      const response = await api.get(`/ai-astrologer/session/${nextSessionId}`);
      setSuggestedPrompts(response.data.suggested_prompts || []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendMessage = useCallback(async (message) => {
    if (!sessionId) return;
    if (!eligible) {
      toast.error("AI Astrologer opens at Blueprint and Master tiers.");
      return;
    }

    setSending(true);
    try {
      const response = await api.post("/ai-astrologer/message", { session_id: sessionId, message });
      persistMessages(response.data.messages || []);
      return response.data;
    } catch (error) {
      toast.error(error?.response?.data?.detail || "The astrologer could not answer right now.");
      throw error;
    } finally {
      setSending(false);
    }
  }, [eligible, persistMessages, sessionId]);

  const value = useMemo(() => ({
    sessionId,
    messages,
    loading,
    sending,
    eligible,
    currentTier: user?.subscription_tier,
    suggestedPrompts,
    sendMessage,
    resetConversation,
  }), [eligible, loading, messages, resetConversation, sendMessage, sending, sessionId, suggestedPrompts, user]);

  return <AstrologerChatContext.Provider value={value}>{children}</AstrologerChatContext.Provider>;
}


export function useAstrologerChat() {
  const context = useContext(AstrologerChatContext);
  if (!context) {
    throw new Error("useAstrologerChat must be used inside AstrologerChatProvider");
  }
  return context;
}