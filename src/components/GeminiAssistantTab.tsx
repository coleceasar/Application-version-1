import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  Shield,
  HelpCircle,
  Cpu,
  RefreshCw,
  CornerDownLeft,
  Bot,
  MessageSquare,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { GeminiChatMessage } from '../types';
import { sendGeminiChat, SUGGESTED_INQUIRIES } from '../services/geminiClient';

interface GeminiAssistantTabProps {
  onInsertIntoChat?: (text: string) => void;
}

const INITIAL_GEMINI_MESSAGES: GeminiChatMessage[] = [
  {
    id: 'gemini-welcome',
    role: 'model',
    content:
      "Hello! I'm your **Gemini AI Assistant** powered by Google's **Gemini 3.8 Flash** model.\n\n" +
      "I'm integrated directly to help you with:\n" +
      "• **Inquiries & Q&A**: Cryptographic protocols, AES-256-GCM, Double Ratchet, DTLS-SRTP WebRTC security\n" +
      "• **Android Privacy**: Keystore StrongBox hardware isolation, offline queue staging, self-destructing burn timers\n" +
      "• **Message Drafting**: Crafting secure, clear operational messages and security memos\n" +
      "• **Technical Guidance**: Auditing payload envelopes, SAS short authentication codes, and cipher suites\n\n" +
      "Ask any question below or pick a suggested inquiry to begin!",
    timestamp: Date.now() - 1000 * 60 * 5,
  },
];

export const GeminiAssistantTab: React.FC<GeminiAssistantTabProps> = ({
  onInsertIntoChat,
}) => {
  const [messages, setMessages] = useState<GeminiChatMessage[]>(() => {
    const saved = localStorage.getItem('gemini_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // ignore fallback
      }
    }
    return INITIAL_GEMINI_MESSAGES;
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save conversation
  useEffect(() => {
    try {
      localStorage.setItem('gemini_chat_history', JSON.stringify(messages));
    } catch {
      // storage quota safe
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    setLastPrompt(textToSend);

    const userMsg: GeminiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputQuery('');
    setIsLoading(true);

    // Pass prior dialogue history to Gemini
    const priorTurns = newHistory.slice(-10);
    const result = await sendGeminiChat(textToSend, priorTurns);

    if (result.error && !result.reply) {
      const errorMsg: GeminiChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `⚠️ **Unable to complete inquiry**: ${result.error}`,
        timestamp: Date.now(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } else {
      const botMsg: GeminiChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: result.reply,
        timestamp: Date.now(),
        modelName: result.model,
        isHighDemandFallback: result.isHighDemandFallback,
      };
      setMessages((prev) => [...prev, botMsg]);
    }

    setIsLoading(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages(INITIAL_GEMINI_MESSAGES);
    try {
      localStorage.removeItem('gemini_chat_history');
    } catch {
      // safe
    }
  };

  const categories = ['All', 'Security', 'Protocol', 'Privacy', 'Compose', 'Android'];

  const filteredInquiries =
    selectedCategory === 'All'
      ? SUGGESTED_INQUIRIES
      : SUGGESTED_INQUIRIES.filter((q) => q.category === selectedCategory);

  return (
    <div id="gemini-assistant-view" className="flex flex-col h-full bg-neutral-950 text-neutral-100 relative">
      {/* Header */}
      <div className="p-3 sm:p-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-neutral-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-neutral-100 flex items-center gap-1.5">
                Gemini Assistant AI
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-500/15 text-teal-300 border border-teal-500/30">
                gemini-3.8-flash
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              AI Security Inquiries & Intelligent Chat
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="clear-gemini-chat-btn"
            type="button"
            onClick={handleClearHistory}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-rose-400 flex items-center justify-center transition-colors"
            title="Clear inquiry history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Inquiries Quick Bar */}
      <div className="px-3 sm:px-4 py-2 bg-neutral-900/60 border-b border-neutral-800/80 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
            Suggested Inquiries
          </span>
          <div className="flex items-center gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                  selectedCategory === cat
                    ? 'bg-teal-500 text-neutral-950 font-semibold'
                    : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Chip Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
          {filteredInquiries.map((inquiry) => (
            <button
              key={inquiry.id}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(inquiry.prompt)}
              className="shrink-0 px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 border border-neutral-700/70 text-[11px] text-neutral-200 hover:text-teal-300 flex items-center gap-1.5 transition-all text-left group"
            >
              <span className="text-teal-400 font-medium">#{inquiry.category}</span>
              <span className="text-neutral-300 group-hover:text-white line-clamp-1 max-w-[200px]">
                {inquiry.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {/* Sender identity */}
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-neutral-400">
              {msg.role === 'model' ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <Sparkles className="w-2.5 h-2.5" />
                  </div>
                  <span className="font-medium text-neutral-300">Gemini Assistant</span>
                </>
              ) : (
                <span className="font-medium text-neutral-300">You (Inquiry)</span>
              )}
              <span>•</span>
              <span>
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Bubble Container */}
            <div
              className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-teal-600 text-white rounded-br-none'
                  : msg.isError
                  ? 'bg-rose-950/40 border border-rose-800/60 text-rose-200 rounded-bl-none'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-bl-none'
              }`}
            >
              {/* Formatted Markdown Content */}
              <div className="space-y-2 whitespace-pre-wrap break-words">
                {msg.content.split('\n\n').map((paragraph, pIdx) => {
                  // Check if bullet points
                  if (paragraph.includes('\n• ') || paragraph.startsWith('• ') || paragraph.startsWith('- ')) {
                    const lines = paragraph.split('\n');
                    return (
                      <ul key={pIdx} className="list-disc pl-4 space-y-1">
                        {lines.map((line, lIdx) => (
                          <li key={lIdx}>
                            {line.replace(/^[•\-]\s*/, '')}
                          </li>
                        ))}
                      </ul>
                    );
                  }

                  // Code block detection
                  if (paragraph.startsWith('```') && paragraph.endsWith('```')) {
                    const code = paragraph.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
                    return (
                      <pre
                        key={pIdx}
                        className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs overflow-x-auto text-teal-300"
                      >
                        <code>{code}</code>
                      </pre>
                    );
                  }

                  // Standard paragraph with bold highlighting
                  const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                  return (
                    <p key={pIdx}>
                      {parts.map((part, partIdx) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return (
                            <strong key={partIdx} className="font-semibold text-neutral-100">
                              {part.slice(2, -2)}
                            </strong>
                          );
                        }
                        return part;
                      })}
                    </p>
                  );
                })}
              </div>

              {/* Error Retry Action */}
              {msg.isError && lastPrompt && (
                <div className="mt-3 pt-2 border-t border-rose-800/40 flex items-center justify-between">
                  <span className="text-[11px] text-rose-300">Temporary peak load.</span>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(lastPrompt)}
                    className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-rose-500/40"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry Inquiry</span>
                  </button>
                </div>
              )}

              {/* Bot Action Buttons (Copy, Insert, Retry) */}
              {msg.role === 'model' && !msg.isError && (
                <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center gap-1 transition-colors"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-teal-400" />
                          <span className="text-teal-400 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {onInsertIntoChat && (
                      <button
                        type="button"
                        onClick={() => onInsertIntoChat(msg.content)}
                        className="px-2 py-1 rounded bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 flex items-center gap-1 border border-teal-500/30 transition-colors"
                        title="Use this text in chat"
                      >
                        <CornerDownLeft className="w-3 h-3" />
                        <span>Use in Chat</span>
                      </button>
                    )}

                    {msg.isHighDemandFallback && lastPrompt && (
                      <button
                        type="button"
                        onClick={() => handleSendMessage(lastPrompt)}
                        className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 flex items-center gap-1 border border-amber-500/30 transition-colors"
                        title="Retry live Gemini cloud model"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry Live</span>
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-neutral-500">
                    {msg.modelName
                      ? msg.modelName
                      : msg.isHighDemandFallback
                      ? 'Local Security Engine'
                      : 'Gemini 3.8 Flash'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-neutral-400">
              <div className="w-3.5 h-3.5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center animate-spin">
                <Sparkles className="w-2.5 h-2.5" />
              </div>
              <span className="font-medium text-neutral-300">Gemini is thinking...</span>
            </div>
            <div className="p-3.5 rounded-2xl rounded-bl-none bg-neutral-900 border border-neutral-800 flex items-center gap-2 text-xs text-neutral-400">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Formulating cryptographic and security inquiry response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Inquiry Input Bar */}
      <div className="p-3 sm:p-4 bg-neutral-900 border-t border-neutral-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              id="gemini-inquiry-input"
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask an inquiry or question (e.g. explain Double Ratchet)..."
              disabled={isLoading}
              className="w-full pl-4 pr-10 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-teal-500 text-xs sm:text-sm"
            />
            {inputQuery.trim() && (
              <button
                type="button"
                onClick={() => setInputQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            id="send-gemini-inquiry-btn"
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="w-11 h-11 rounded-2xl bg-teal-500 hover:bg-teal-400 text-neutral-950 disabled:opacity-40 disabled:hover:bg-teal-500 flex items-center justify-center transition-all shadow-md shadow-teal-500/20 shrink-0"
            title="Submit inquiry to Gemini"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>

        <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-neutral-500 font-mono">
          <span>Model: gemini-3.8-flash</span>
          <span>Google AI Studio • Verified Assistant</span>
        </div>
      </div>
    </div>
  );
};
