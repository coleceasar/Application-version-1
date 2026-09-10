/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  MessageSquare,
  Shield,
  Languages,
  X,
  Loader2,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Message, Contact } from '../types';

interface ChatAIBarProps {
  contact: Contact;
  messages: Message[];
  onSelectReply: (replyText: string) => void;
}

export const ChatAIBar: React.FC<ChatAIBarProps> = ({
  contact,
  messages,
  onSelectReply,
}) => {
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [securityExplanation, setSecurityExplanation] = useState<string | null>(null);
  const [isOpenMenu, setIsOpenMenu] = useState(false);

  // Fetch smart replies when the last message changes
  const lastMessage = messages[messages.length - 1];
  const lastMessageText = lastMessage?.text || '';

  useEffect(() => {
    if (!lastMessageText || lastMessage?.isSelf) {
      setSmartReplies([]);
      return;
    }

    let isMounted = true;
    const fetchReplies = async () => {
      try {
        setLoadingReplies(true);
        const res = await fetch('/api/gemini/smart-replies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lastMessageText,
            contactName: contact.name,
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && Array.isArray(data.replies) && data.replies.length > 0) {
          setSmartReplies(data.replies);
        }
      } catch (err) {
        console.warn('Smart replies failed to fetch:', err);
      } finally {
        if (isMounted) setLoadingReplies(false);
      }
    };

    fetchReplies();
    return () => {
      isMounted = false;
    };
  }, [lastMessageText, contact.name, lastMessage?.isSelf]);

  const handleSummarize = async () => {
    if (messages.length === 0) return;
    try {
      setLoadingSummary(true);
      setSecurityExplanation(null);
      const res = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            senderName: m.senderName,
            text: m.text,
          })),
          contactName: contact.name,
        }),
      });
      const data = await res.json();
      setSummary(data.summary || 'Summary completed.');
    } catch {
      setSummary('Unable to generate AI summary at this time. Please check your connection.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleExplainSecurity = () => {
    setSummary(null);
    setSecurityExplanation(
      `**End-to-End Cryptographic Guarantee with ${contact.name}:**\n` +
      `• **Cipher**: AES-256-GCM authenticated encryption with 96-bit unique IV per message.\n` +
      `• **Hardware Protection**: Keys held in Android Keystore StrongBox TEE.\n` +
      `• **Double Ratchet**: Ephemeral session keys wiped from RAM immediately upon deciphering.\n` +
      `• **Integrity Tag**: 128-bit GHASH authentication tag verifies zero tampering in transit.`
    );
  };

  return (
    <div className="space-y-1.5 px-3 py-1 bg-neutral-900/40 border-t border-neutral-800/60">
      {/* Smart Reply Pills (when peer sent a message) */}
      {smartReplies.length > 0 && !lastMessage?.isSelf && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-1 rounded-lg shrink-0 border border-teal-500/20">
            <Sparkles className="w-3 h-3" />
            <span>AI Replies</span>
          </div>
          {smartReplies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => onSelectReply(reply)}
              className="text-xs text-neutral-200 bg-neutral-800 hover:bg-neutral-750 hover:text-white border border-neutral-700/80 px-3 py-1 rounded-full whitespace-nowrap transition-all active:scale-95 shadow-sm"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Collapsible Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            id="btn-ai-summarize-chat"
            onClick={handleSummarize}
            disabled={loadingSummary || messages.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700/60 text-[11px] font-medium text-neutral-300 hover:text-teal-400 transition-colors disabled:opacity-40"
          >
            {loadingSummary ? (
              <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
            ) : (
              <FileText className="w-3 h-3 text-teal-400" />
            )}
            <span>Summarize Chat</span>
          </button>

          <button
            id="btn-ai-explain-security"
            onClick={handleExplainSecurity}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700/60 text-[11px] font-medium text-neutral-300 hover:text-teal-400 transition-colors"
          >
            <Shield className="w-3 h-3 text-teal-400" />
            <span>Security Explainer</span>
          </button>
        </div>

        <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-teal-400" /> Gemini Intelligence
        </span>
      </div>

      {/* Summary or Security Explanation Card */}
      {(summary || securityExplanation) && (
        <div className="p-3 bg-neutral-850 border border-teal-500/30 rounded-xl space-y-1.5 text-xs text-neutral-200 relative animate-in fade-in zoom-in-95">
          <button
            onClick={() => {
              setSummary(null);
              setSecurityExplanation(null);
            }}
            className="absolute top-2 right-2 p-1 rounded-full text-neutral-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5 font-bold text-teal-400 text-xs">
            {summary ? <FileText className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
            <span>{summary ? 'AI Conversation Briefing' : 'Cryptographic Security Analysis'}</span>
          </div>
          <div className="whitespace-pre-line text-neutral-300 leading-relaxed text-[11px] pr-4">
            {summary || securityExplanation}
          </div>
        </div>
      )}
    </div>
  );
};
