/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Flame,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Clock,
  Code2,
  Lock,
  WifiOff,
  Sparkles,
  Info,
  MoreVertical,
  Volume2,
  Phone,
  Video,
  Trash2,
  FlameKindling,
  Timer,
  MapPin,
  Radio,
  Navigation,
  Copy,
  Download,
  Bot,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  UserCheck,
  Users,
  FileDown,
  Star,
  Palette,
  Share2,
  Mic,
  Smile,
  SmilePlus,
  Calendar,
  Eye,
  Unlock,
} from 'lucide-react';
import { Contact, Message, MediaType, NetworkType, CallType, LiveLocationData, ScheduledMessage } from '../types';
import { LocationShareModal } from './LocationShareModal';
import { ChatAIBar } from './ChatAIBar';
import { websocketService } from '../services/websocketService';
import { exportLocalChatData } from '../services/googleDriveService';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { EmojiGifPicker } from './EmojiGifPicker';
import { ViewOnceModal } from './ViewOnceModal';
import { ScheduleMessageModal } from './ScheduleMessageModal';
import { MessageReactionPicker } from './MessageReactionPicker';

interface ChatRoomProps {
  contact: Contact;
  messages: Message[];
  currentNetwork: NetworkType;
  onBack: () => void;
  onSendMessage: (
    text: string,
    mediaType?: MediaType,
    mediaUrl?: string,
    caption?: string,
    ephemeralSeconds?: number,
    locationData?: LiveLocationData,
    isViewOnce?: boolean,
    audioDuration?: number
  ) => void;
  onInspectMessage: (msg: Message) => void;
  onOpenSafetyNumber: () => void;
  onOpenContactDetails?: () => void;
  onOpenMediaModal: () => void;
  onBurnMessage: (msgId: string) => void;
  onPermanentlyDeleteMessage: (msgId: string) => void;
  onStartVoiceCall: () => void;
  onStartVideoCall: () => void;
  onSimulateIncomingCall: (type: CallType) => void;
  isAiTyping?: boolean;
  onClearChat?: () => void;
  onOpenInstallModal?: () => void;
  targetMessageId?: string | null;
  onToggleStarMessage?: (msgId: string) => void;
  onOpenWallpaperModal?: () => void;
  onOpenStarredMessages?: () => void;
  draftText?: string;
  onSaveDraft?: (draft: string) => void;
  onToggleReaction?: (msgId: string, emoji: string) => void;
  onOpenViewOnce?: (msg: Message) => void;
  onScheduleMessage?: (
    text: string,
    scheduledTimestamp: number,
    mediaType?: MediaType,
    mediaUrl?: string,
    caption?: string,
    ephemeralSeconds?: number,
    isViewOnce?: boolean,
    audioDuration?: number
  ) => void;
  scheduledMessages?: ScheduledMessage[];
  onCancelScheduledMessage?: (id: string) => void;
  onToggleLockContact?: (contactId: string) => void;
  readReceiptsEnabled?: boolean;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  contact,
  messages,
  currentNetwork,
  onBack,
  onSendMessage,
  onInspectMessage,
  onOpenSafetyNumber,
  onOpenContactDetails,
  onOpenMediaModal,
  onBurnMessage,
  onPermanentlyDeleteMessage,
  onStartVoiceCall,
  onStartVideoCall,
  onSimulateIncomingCall,
  isAiTyping = false,
  onClearChat,
  onOpenInstallModal,
  targetMessageId,
  onToggleStarMessage,
  onOpenWallpaperModal,
  onOpenStarredMessages,
  draftText = '',
  onSaveDraft,
  onToggleReaction,
  onOpenViewOnce,
  onScheduleMessage,
  scheduledMessages = [],
  onCancelScheduledMessage,
  onToggleLockContact,
  readReceiptsEnabled = true,
}) => {
  const [inputText, setInputText] = useState(draftText);
  const [activeEphemeralSec, setActiveEphemeralSec] = useState<number>(0);
  const [showEphemeralMenu, setShowEphemeralMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [shreddingMsgIds, setShreddingMsgIds] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [readReceiptToast, setReadReceiptToast] = useState<string | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // New features state
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [activeViewOnceMsg, setActiveViewOnceMsg] = useState<Message | null>(null);
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState<string | null>(null);
  const [showScheduledListModal, setShowScheduledListModal] = useState(false);

  // Auto-save draft synchronization refs to avoid state update depth loops
  const latestInputRef = useRef(inputText);
  latestInputRef.current = inputText;
  const onSaveDraftRef = useRef(onSaveDraft);
  onSaveDraftRef.current = onSaveDraft;
  const draftSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync draftText ONLY when changing contacts
  useEffect(() => {
    setInputText(draftText || '');
    latestInputRef.current = draftText || '';
  }, [contact.id]);

  // Persist draft on contact switch or unmount
  useEffect(() => {
    const activeId = contact.id;
    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
      if (onSaveDraftRef.current) {
        onSaveDraftRef.current(latestInputRef.current, activeId);
      }
    };
  }, [contact.id]);

  // In-chat search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchMatchIndex, setActiveSearchMatchIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Notify server and peers via WebSocket that recipient opened this chat room
  useEffect(() => {
    websocketService.sendChatOpen(contact.id, 'self', 'You');
  }, [contact.id]);

  // Listen for WebSocket read receipts to display subtle live confirmation
  useEffect(() => {
    const unsub = websocketService.onMessageRead((payload) => {
      if (payload.chatId === contact.id) {
        setReadReceiptToast(`Read by ${contact.name}`);
        const timer = setTimeout(() => setReadReceiptToast(null), 3000);
        return () => clearTimeout(timer);
      }
    });
    return () => unsub();
  }, [contact.id, contact.name]);

  // Listen for WebSocket typing indicators
  useEffect(() => {
    const unsub = websocketService.onTyping((payload) => {
      if (payload.chatId === contact.id) {
        setPeerIsTyping(payload.isTyping);
      }
    });
    return () => unsub();
  }, [contact.id]);

  // Target message scroll-in if opened from search result
  useEffect(() => {
    if (targetMessageId) {
      setTimeout(() => {
        const el = document.getElementById(`chat-msg-${targetMessageId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [targetMessageId]);

  // Matched message IDs for in-chat search
  const matchedMessageIds = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return messages
      .filter((m) => !m.isBurned && m.text && m.text.toLowerCase().includes(q))
      .map((m) => m.id);
  }, [messages, searchQuery]);

  const handlePrevMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const nextIdx = (activeSearchMatchIndex - 1 + matchedMessageIds.length) % matchedMessageIds.length;
    setActiveSearchMatchIndex(nextIdx);
    const targetId = matchedMessageIds[nextIdx];
    document.getElementById(`chat-msg-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleNextMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const nextIdx = (activeSearchMatchIndex + 1) % matchedMessageIds.length;
    setActiveSearchMatchIndex(nextIdx);
    const targetId = matchedMessageIds[nextIdx];
    document.getElementById(`chat-msg-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Auto-scroll to bottom if not searching
  useEffect(() => {
    if (!isSearching && !targetMessageId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isAiTyping, isSearching, targetMessageId]);

  // Handle active self-destruct timers countdown and permanent deletion from both devices
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      messages.forEach((msg) => {
        if (msg.expiresAt && msg.expiresAt <= now && !shreddingMsgIds.has(msg.id)) {
          // Trigger visual shredding animation
          setShreddingMsgIds((prev) => new Set(prev).add(msg.id));

          // After burning animation (900ms), permanently delete from both sender and recipient devices
          setTimeout(() => {
            onPermanentlyDeleteMessage(msg.id);
            setShreddingMsgIds((prev) => {
              const next = new Set(prev);
              next.delete(msg.id);
              return next;
            });
          }, 900);
        }
      });
    }, 500);

    return () => clearInterval(interval);
  }, [messages, shreddingMsgIds, onPermanentlyDeleteMessage]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const timer = activeEphemeralSec;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    websocketService.sendTyping(contact.id, false);
    onSendMessage(inputText.trim(), 'text', undefined, undefined, timer);
    setInputText('');
    latestInputRef.current = '';
    if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
    if (onSaveDraftRef.current) onSaveDraftRef.current('', contact.id);

    // Trigger realistic encrypted peer response after a brief delay if network is not offline (friends only, Gemini is handled via backend)
    if (currentNetwork !== 'OFFLINE' && contact.id !== 'contact_gemini') {
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          // Generate automated contextual peer reply
          let replyText = 'Message received and authenticated with AES-256-GCM. Hardware tag matched.';
          if (contact.id === 'contact_elena') {
            replyText = timer > 0
              ? `Ephemeral message timer acknowledged (${timer}s). Auto-destruct worker armed on my device.`
              : 'Double Ratchet ephemeral DH keys rotated. Decryption completed in 6ms.';
          } else if (contact.id === 'contact_marcus') {
            replyText = 'Keystore StrongBox confirmed. Key alias MasterKey_Keystore_v2 integrity 100%.';
          } else if (contact.id === 'contact_sarah') {
            replyText = 'Audited TLS 1.3 frame. No metadata leaked; auth tag verified.';
          } else if (contact.id === 'contact_david') {
            replyText = 'Room DB synchronization worker acknowledged outbox payload.';
          }
          // If the user sent with ephemeral timer, recipient may also respond with an ephemeral message
          onSendMessage(replyText, 'text', undefined, undefined, timer > 0 ? timer : 0);
        }, 1800);
      }, 700);
    }
  };

  const handleSendVoiceNote = (audioUrl: string, durationSeconds: number) => {
    setIsRecordingVoiceNote(false);
    onSendMessage(
      '🎤 Voice note',
      'audio',
      audioUrl,
      'Encrypted voice note',
      activeEphemeralSec,
      undefined,
      false,
      durationSeconds
    );
    if (onSaveDraft) onSaveDraft('');
  };

  const handleSendGif = (gifUrl: string, title: string) => {
    onSendMessage(
      `[GIF] ${title}`,
      'image',
      gifUrl,
      title,
      activeEphemeralSec
    );
  };

  const handleConfirmSchedule = (scheduledTimestamp: number) => {
    if (onScheduleMessage && inputText.trim()) {
      onScheduleMessage(
        inputText.trim(),
        scheduledTimestamp,
        'text',
        undefined,
        undefined,
        activeEphemeralSec
      );
      setInputText('');
      if (onSaveDraft) onSaveDraft('');
    }
  };

  const renderFormattedMessageText = (text: string) => {
    const paragraphs = text.split('\n\n');
    return (
      <div className="space-y-1.5 whitespace-pre-wrap break-words leading-relaxed text-xs sm:text-sm">
        {paragraphs.map((para, pIdx) => {
          // Check for code blocks
          if (para.includes('```')) {
            const blockRegex = /```([a-z]*)\n?([\s\S]*?)```/g;
            const elements: React.ReactNode[] = [];
            let lastIndex = 0;
            let match;
            while ((match = blockRegex.exec(para)) !== null) {
              if (match.index > lastIndex) {
                elements.push(<span key={`txt-${lastIndex}`}>{para.substring(lastIndex, match.index)}</span>);
              }
              const lang = match[1];
              const code = match[2];
              elements.push(
                <div key={`code-${match.index}`} className="my-2 rounded-xl bg-neutral-950 border border-neutral-800 p-2.5 font-mono text-[11px] overflow-x-auto text-teal-300 relative group/code">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1 border-b border-neutral-800/80 pb-1">
                    <span>{lang || 'snippet'}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(code);
                      }}
                      className="hover:text-teal-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre><code>{code}</code></pre>
                </div>
              );
              lastIndex = match.index + match[0].length;
            }
            if (lastIndex < para.length) {
              elements.push(<span key={`txt-end`}>{para.substring(lastIndex)}</span>);
            }
            return <div key={pIdx}>{elements}</div>;
          }

          // Bullet list items
          if (para.startsWith('• ') || para.startsWith('- ') || para.includes('\n• ') || para.includes('\n- ')) {
            const lines = para.split('\n');
            return (
              <ul key={pIdx} className="list-disc pl-4 space-y-1 my-1">
                {lines.map((line, lIdx) => {
                  const cleaned = line.replace(/^[•\-]\s*/, '');
                  const parts = cleaned.split(/(\*\*.*?\*\*)/g);
                  return (
                    <li key={lIdx}>
                      {parts.map((part, partIdx) =>
                        part.startsWith('**') && part.endsWith('**') ? (
                          <strong key={partIdx} className="font-semibold text-neutral-100">{part.slice(2, -2)}</strong>
                        ) : (
                          part
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            );
          }

          // Standard paragraph with bold formatting
          const parts = para.split(/(\*\*.*?\*\*)/g);
          return (
            <p key={pIdx}>
              {parts.map((part, partIdx) =>
                part.startsWith('**') && part.endsWith('**') ? (
                  <strong key={partIdx} className="font-semibold text-neutral-100">{part.slice(2, -2)}</strong>
                ) : (
                  part
                )
              )}
            </p>
          );
        })}
      </div>
    );
  };

  const handleSendTestSelfDestruct = (sec: number) => {
    setActiveEphemeralSec(sec);
    onSendMessage(
      `Confidential: Ephemeral test payload. Automatically shredded in ${sec} seconds on both devices!`,
      'text',
      undefined,
      undefined,
      sec
    );
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div id="chatroom-container" className="flex flex-col h-full bg-neutral-950 text-neutral-100 relative">
      {/* Top App Bar (Material 3 Style) */}
      <div className="h-16 px-3 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <button
            id="chat-back-btn"
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full hover:bg-neutral-800 flex items-center justify-center text-neutral-300 hover:text-neutral-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            id="chat-header-profile"
            onClick={() => {
              if (onOpenContactDetails) {
                onOpenContactDetails();
              } else {
                onOpenSafetyNumber();
              }
            }}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity min-w-0"
          >
            <div className="relative shrink-0">
              <img
                src={contact.avatar}
                alt={contact.name}
                className="w-10 h-10 rounded-full object-cover border border-neutral-700"
              />
              {contact.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-teal-400 border-2 border-neutral-900" />
              )}
            </div>

            <div className="min-w-0 truncate">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-neutral-100 leading-tight truncate">
                  {contact.name}
                </h3>
                {contact.isVerified ? (
                  <span title="Safety Number Verified" className="shrink-0">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                  </span>
                ) : (
                  <span title="Click to verify Safety Number" className="shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-neutral-500 hover:text-teal-400" />
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                <span className="truncate">AES-256 E2EE Active</span>
              </p>
            </div>
          </div>
        </div>

        {/* Top actions: Calls, Ephemeral Timer, Search, More */}
        <div className="flex items-center gap-1 shrink-0">
          {/* In-Chat Search Button */}
          <button
            id="toggle-chat-search-btn"
            type="button"
            onClick={() => {
              setIsSearching(!isSearching);
              if (isSearching) setSearchQuery('');
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              isSearching
                ? 'bg-teal-500/20 text-teal-400'
                : 'text-neutral-300 hover:text-teal-400 hover:bg-neutral-800'
            }`}
            title="Search in conversation"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* WebRTC Voice Call Button */}
          <button
            id="voice-call-btn"
            type="button"
            onClick={onStartVoiceCall}
            className="w-9 h-9 rounded-full text-neutral-300 hover:text-teal-400 hover:bg-neutral-800 flex items-center justify-center transition-colors"
            title="Encrypted WebRTC Voice Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          {/* WebRTC Video Call Button */}
          <button
            id="video-call-btn"
            type="button"
            onClick={onStartVideoCall}
            className="w-9 h-9 rounded-full text-neutral-300 hover:text-teal-400 hover:bg-neutral-800 flex items-center justify-center transition-colors"
            title="Encrypted WebRTC Video Call"
          >
            <Video className="w-4 h-4" />
          </button>

          {/* Ephemeral Timer Selector Toggle */}
          <div className="relative">
            <button
              id="ephemeral-timer-toggle-btn"
              type="button"
              onClick={() => setShowEphemeralMenu(!showEphemeralMenu)}
              className={`p-2 rounded-full transition-colors flex items-center gap-1 text-xs ${
                activeEphemeralSec > 0
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
              title="Disappearing messages timer"
            >
              <Flame className="w-4 h-4" />
              {activeEphemeralSec > 0 && (
                <span className="text-[10px] font-mono font-bold">
                  {activeEphemeralSec < 60
                    ? `${activeEphemeralSec}s`
                    : activeEphemeralSec < 3600
                    ? `${Math.round(activeEphemeralSec / 60)}m`
                    : `${Math.round(activeEphemeralSec / 3600)}h`}
                </span>
              )}
            </button>

            {/* Ephemeral dropdown */}
            {showEphemeralMenu && (
              <div className="absolute right-0 top-12 w-52 rounded-2xl bg-neutral-900 border border-neutral-800 p-2 shadow-2xl z-50 text-xs space-y-1">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-neutral-400 border-b border-neutral-800/80 flex items-center justify-between">
                  <span>Self-Destructing Messages</span>
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="p-1 text-[10px] text-neutral-400 leading-tight">
                  Messages permanently delete from both sender and recipient devices when timer expires.
                </div>
                {[
                  { sec: 0, label: 'Off' },
                  { sec: 5, label: '5 seconds (Fast Test)' },
                  { sec: 10, label: '10 seconds' },
                  { sec: 30, label: '30 seconds' },
                  { sec: 60, label: '1 minute' },
                  { sec: 300, label: '5 minutes' },
                  { sec: 3600, label: '1 hour' },
                ].map((opt) => (
                  <button
                    key={opt.sec}
                    type="button"
                    onClick={() => {
                      setActiveEphemeralSec(opt.sec);
                      setShowEphemeralMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                      activeEphemeralSec === opt.sec
                        ? 'bg-amber-500/20 text-amber-300 font-medium'
                        : 'text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {activeEphemeralSec === opt.sec && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* More options menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="w-9 h-9 rounded-full text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 flex items-center justify-center transition-colors"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-12 w-60 rounded-2xl bg-neutral-900 border border-neutral-800 p-2 shadow-2xl z-50 text-xs space-y-1">
                {onOpenContactDetails && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenContactDetails();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-teal-300 hover:bg-neutral-800 flex items-center gap-2"
                  >
                    {contact.isGroup ? (
                      <Users className="w-4 h-4 text-teal-400" />
                    ) : (
                      <UserCheck className="w-4 h-4 text-teal-400" />
                    )}
                    <span>{contact.isGroup ? 'Group Information & Members' : 'View Contact Details'}</span>
                  </button>
                )}
                {onToggleLockContact && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onToggleLockContact(contact.id);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-amber-300 hover:bg-neutral-800 flex items-center gap-2 border-b border-neutral-800"
                  >
                    {contact.isLocked ? (
                      <>
                        <Unlock className="w-4 h-4 text-emerald-400" />
                        <span>Unlock Chat (Remove PIN)</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>Lock Chat (PIN / Biometrics)</span>
                      </>
                    )}
                  </button>
                )}
                {onOpenWallpaperModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenWallpaperModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-teal-300 hover:bg-neutral-800 flex items-center gap-2"
                  >
                    <Palette className="w-4 h-4 text-teal-400" />
                    <span>Chat Wallpaper</span>
                  </button>
                )}
                {onOpenStarredMessages && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenStarredMessages();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-amber-300 hover:bg-neutral-800 flex items-center gap-2"
                  >
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Starred Messages</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    exportLocalChatData([contact], { [contact.id]: messages });
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-neutral-300 hover:bg-neutral-800 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4 text-teal-400" />
                  <span>Export Chat History (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onOpenSafetyNumber();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-neutral-300 hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Lock className="w-4 h-4 text-teal-400" />
                  <span>Verify Safety Number</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onSimulateIncomingCall('voice');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-neutral-300 hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Phone className="w-4 h-4 text-teal-400" />
                  <span>Simulate Incoming Voice Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onSimulateIncomingCall('video');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-neutral-300 hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Video className="w-4 h-4 text-teal-400" />
                  <span>Simulate Incoming Video Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleSendTestSelfDestruct(5);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-amber-300 hover:bg-neutral-800 flex items-center gap-2 border-t border-neutral-800"
                >
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Send 5s Self-Destruct Test</span>
                </button>
                {onOpenInstallModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenInstallModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-teal-300 hover:bg-neutral-800 flex items-center gap-2 border-t border-neutral-800"
                  >
                    <Download className="w-4 h-4 text-teal-400" />
                    <span>Download App (Install on Phone)</span>
                  </button>
                )}
                {onClearChat && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onClearChat();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-rose-400 hover:bg-neutral-800 flex items-center gap-2 border-t border-neutral-800"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Clear Chat History</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-Chat Real-Time Search Bar */}
      {isSearching && (
        <div
          id="in-chat-search-bar"
          className="bg-neutral-900/95 border-b border-neutral-800 px-3 py-2 flex items-center gap-2 shrink-0 z-10 backdrop-blur-md"
        >
          <Search className="w-4 h-4 text-teal-400 shrink-0" />
          <input
            id="in-chat-search-input"
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveSearchMatchIndex(0);
            }}
            placeholder="Search within this chat..."
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-teal-500"
          />
          <span className="text-[11px] font-mono text-neutral-400 shrink-0">
            {searchQuery.trim()
              ? matchedMessageIds.length > 0
                ? `${activeSearchMatchIndex + 1} of ${matchedMessageIds.length}`
                : '0 matches'
              : ''}
          </span>
          <button
            id="chat-search-prev-btn"
            type="button"
            onClick={handlePrevMatch}
            disabled={matchedMessageIds.length === 0}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Previous match"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            id="chat-search-next-btn"
            type="button"
            onClick={handleNextMatch}
            disabled={matchedMessageIds.length === 0}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Next match"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            id="chat-search-close-btn"
            type="button"
            onClick={() => {
              setIsSearching(false);
              setSearchQuery('');
            }}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WebSocket Read Receipt Confirmation Toast */}
      {readReceiptToast && (
        <div
          id="read-receipt-live-toast"
          className="bg-cyan-950/80 border-b border-cyan-800/60 px-4 py-1.5 text-xs text-cyan-200 flex items-center justify-between shrink-0 z-10 animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-medium">{readReceiptToast}</span>
          </div>
          <span className="text-[10px] font-mono bg-cyan-900/60 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-700/50">
            WebSocket Sync
          </span>
        </div>
      )}

      {/* Network Alert if Offline */}
      {currentNetwork === 'OFFLINE' && (
        <div className="bg-amber-950/80 border-b border-amber-800/60 px-4 py-2 text-xs text-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Device is Offline. Outgoing messages will queue in Room SQLite DB.</span>
          </div>
          <span className="text-[10px] font-mono bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700/50">
            WorkManager Outbox
          </span>
        </div>
      )}

      {/* Ephemeral Timer Active Banner if set */}
      {activeEphemeralSec > 0 && (
        <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 py-1.5 text-[11px] text-amber-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>
              Disappearing messages set to{' '}
              <strong className="font-mono">
                {activeEphemeralSec < 60
                  ? `${activeEphemeralSec} seconds`
                  : activeEphemeralSec < 3600
                  ? `${Math.round(activeEphemeralSec / 60)} minute(s)`
                  : `${Math.round(activeEphemeralSec / 3600)} hour`}
              </strong>
              . Permanently purged on recipient expiry.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveEphemeralSec(0)}
            className="text-[10px] text-neutral-400 hover:text-white underline ml-2"
          >
            Turn off
          </button>
        </div>
      )}

      {/* Pending Scheduled Messages Banner */}
      {scheduledMessages.filter((s) => s.chatId === contact.id).length > 0 && (
        <div className="bg-teal-950/60 border-b border-teal-800/40 px-4 py-1.5 text-[11px] text-teal-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span>
              <strong>{scheduledMessages.filter((s) => s.chatId === contact.id).length}</strong> scheduled message(s) queued for encrypted dispatch
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowScheduledListModal(true)}
            className="text-[10px] text-teal-200 underline hover:text-white ml-2 cursor-pointer font-medium"
          >
            View / Cancel
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        id="messages-scroll-area"
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 relative"
        style={{
          background: contact.wallpaper
            ? contact.wallpaper.startsWith('url')
              ? `${contact.wallpaper} center/cover no-repeat`
              : contact.wallpaper
            : undefined,
          opacity: contact.wallpaperOpacity ? contact.wallpaperOpacity / 100 : undefined,
        }}
      >
        {/* Security Watermark */}
        <div className="py-1 text-center shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/80 border border-neutral-800 text-[11px] text-neutral-400">
            <Lock className="w-3 h-3 text-teal-400" />
            <span>Messages and calls are end-to-end encrypted with AES-256-GCM.</span>
          </div>
        </div>

        {messages.map((msg) => {
          const isShredding = shreddingMsgIds.has(msg.id) || msg.isShredding;
          const isOutgoing = msg.isSelf;

          // If the message is currently in the shredding/burning dissolve phase
          if (isShredding) {
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} transition-all duration-700 opacity-20 scale-95 blur-xs`}
              >
                <div className="rounded-2xl p-3 bg-red-950/80 border border-red-500/80 text-red-200 text-xs flex items-center gap-2">
                  <FlameKindling className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span className="font-mono font-bold">
                    Zeroizing key & permanently shredding message...
                  </span>
                </div>
              </div>
            );
          }

          const isTargeted = msg.id === targetMessageId;
          const isSearchMatch = isSearching && matchedMessageIds.includes(msg.id);
          const isCurrentActiveMatch = isSearching && matchedMessageIds[activeSearchMatchIndex] === msg.id;

          return (
            <div
              key={msg.id}
              id={`chat-msg-${msg.id}`}
              className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} group transition-all duration-300 relative`}
            >
              {/* Message Reaction Picker Popup */}
              {activeReactionPickerMsgId === msg.id && (
                <div className={`absolute z-30 ${isOutgoing ? 'right-0' : 'left-0'} -top-10`}>
                  <MessageReactionPicker
                    onSelectReaction={(emoji) => {
                      onToggleReaction?.(msg.id, emoji);
                      setActiveReactionPickerMsgId(null);
                    }}
                    onOpenFullPicker={() => {
                      setActiveReactionPickerMsgId(null);
                      setIsEmojiPickerOpen(true);
                    }}
                    onClose={() => setActiveReactionPickerMsgId(null)}
                    isSelf={isOutgoing}
                  />
                </div>
              )}

              <div
                className={`relative max-w-[85%] sm:max-w-[75%] rounded-3xl p-3 shadow-md transition-all ${
                  isCurrentActiveMatch
                    ? 'ring-2 ring-amber-400 bg-amber-950/40 shadow-lg shadow-amber-500/20 scale-[1.01]'
                    : isTargeted
                    ? 'ring-2 ring-teal-400 bg-teal-950/40 shadow-lg shadow-teal-500/20 scale-[1.01]'
                    : isSearchMatch
                    ? 'ring-1 ring-teal-400/80 bg-teal-950/30'
                    : isOutgoing
                    ? 'bg-teal-700/90 text-white rounded-tr-sm border border-teal-600/50'
                    : 'bg-neutral-800/95 text-neutral-100 rounded-tl-sm border border-neutral-700/60'
                }`}
              >
                {/* View-Once media preview */}
                {msg.isViewOnce ? (
                  <div className="mb-2">
                    {msg.viewOnceOpened ? (
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-neutral-900/80 border border-neutral-700/60 text-neutral-400">
                        <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-mono">
                          ✓
                        </div>
                        <div className="text-xs">
                          <p className="font-semibold text-neutral-300">Opened • View Once {msg.mediaType === 'video' ? 'Video' : 'Photo'}</p>
                          <p className="text-[10px] text-neutral-500 font-mono">Zeroized and destroyed</p>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenViewOnce) {
                            onOpenViewOnce(msg);
                          } else {
                            setActiveViewOnceMsg(msg);
                          }
                        }}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-teal-950/60 hover:bg-teal-900/70 border border-teal-500/50 text-teal-200 transition-all cursor-pointer text-left w-full shadow-sm active:scale-98"
                      >
                        <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-400/80 flex items-center justify-center text-teal-300 font-bold font-mono text-xs shadow-inner">
                          1
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-teal-100 flex items-center gap-1.5">
                            <span>View-Once {msg.mediaType === 'video' ? 'Video' : 'Photo'}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                          </p>
                          <p className="text-[10px] text-teal-300/80 font-mono">Tap to view • Destructs when closed</p>
                        </div>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Voice note audio player */}
                    {msg.mediaType === 'audio' && (
                      <div className="mb-2">
                        <VoiceNotePlayer
                          audioUrl={msg.mediaUrl}
                          durationSeconds={msg.audioDuration}
                          isSelf={isOutgoing}
                        />
                      </div>
                    )}

                    {/* Image rendering */}
                    {msg.mediaType === 'image' && msg.mediaUrl && (
                      <div className="rounded-2xl overflow-hidden mb-2 border border-black/20 bg-black/40">
                        <img
                          src={msg.mediaUrl}
                          alt="Encrypted attachment"
                          className="w-full max-h-60 object-cover"
                        />
                      </div>
                    )}

                    {/* Video rendering */}
                    {msg.mediaType === 'video' && msg.mediaUrl && (
                      <div className="rounded-2xl overflow-hidden mb-2 border border-black/20 bg-black aspect-video flex items-center justify-center">
                        <video
                          src={msg.mediaUrl}
                          controls
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Real-time Location rendering */}
                {msg.mediaType === 'location' && msg.locationData && (
                  <div className="rounded-2xl overflow-hidden mb-2 border border-black/30 bg-neutral-950/90 text-neutral-100 shadow-inner">
                    {/* Visual Radar Map Card */}
                    <div className="relative h-32 bg-neutral-950 overflow-hidden flex items-center justify-center border-b border-neutral-800">
                      {/* Grid background */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:16px_16px] opacity-40" />

                      {/* Radar sweep */}
                      <div className="absolute w-24 h-24 rounded-full border border-teal-500/30 animate-ping" />
                      <div className="absolute w-36 h-36 rounded-full border border-teal-500/20" />

                      {/* Center pin with pulse */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/50 animate-pulse">
                          <MapPin className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Live Badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-950/80 border border-teal-500/40 text-[10px] text-teal-300 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                        <span>LIVE GPS</span>
                      </div>

                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-neutral-900/90 border border-neutral-800 text-[9px] font-mono text-neutral-400">
                        ±{msg.locationData.accuracy}m RTK
                      </div>
                    </div>

                    {/* Coordinates & Status */}
                    <div className="p-2.5 space-y-1 bg-neutral-900/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-200">
                          {msg.locationData.addressLabel || 'Real-time Live Location'}
                        </span>
                        <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                          E2EE GeoPoint
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-neutral-400 flex items-center justify-between">
                        <span>
                          {msg.locationData.latitude.toFixed(5)}°, {msg.locationData.longitude.toFixed(5)}°
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Expires in {msg.locationData.durationMinutes}m
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message Text with Markdown and Code Formatting */}
                {renderFormattedMessageText(msg.text)}

                {/* Message Reactions Pills */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-white/10">
                    {Object.entries(msg.reactions).map(([emoji, rawUsers]) => {
                      const users = Array.isArray(rawUsers) ? (rawUsers as string[]) : [];
                      const hasUserReacted = users.includes('self');
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => onToggleReaction?.(msg.id, emoji)}
                          className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border transition-transform active:scale-95 cursor-pointer ${
                            hasUserReacted
                              ? 'bg-teal-500/30 border-teal-400 text-teal-100 font-bold'
                              : 'bg-neutral-900/80 border-neutral-700 text-neutral-200 hover:bg-neutral-800'
                          }`}
                          title={`${users.length} reaction(s)`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] font-mono">{users.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Message Metadata Footer */}
                <div
                  className={`flex items-center gap-1.5 justify-end mt-1 text-[10px] ${
                    isOutgoing ? 'text-teal-200/80' : 'text-neutral-400'
                  }`}
                >
                  {/* Ephemeral Burning Live Countdown */}
                  {msg.expiresAt && (
                    <span
                      className="flex items-center gap-0.5 text-amber-300 font-mono font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-700/50"
                      title="Self-destruct timer (permanently purged from both devices at 0s)"
                    >
                      <Flame className="w-3 h-3 text-amber-400 animate-pulse" />
                      <span>{Math.max(0, Math.round((msg.expiresAt - Date.now()) / 1000))}s</span>
                    </span>
                  )}

                  {/* Reaction trigger */}
                  <button
                    id={`reaction-btn-${msg.id}`}
                    type="button"
                    onClick={() => setActiveReactionPickerMsgId(activeReactionPickerMsgId === msg.id ? null : msg.id)}
                    className="ml-0.5 opacity-70 hover:opacity-100 text-neutral-300 hover:text-teal-300 transition-opacity"
                    title="Add reaction"
                  >
                    <SmilePlus className="w-3.5 h-3.5" />
                  </button>

                  {/* Timestamp */}
                  <span>{formatTime(msg.timestamp)}</span>

                  {/* Delivery Status Indicator */}
                  {isOutgoing && (
                    <span className="ml-0.5">
                      {msg.status === 'queued_offline' && (
                        <span title="Queued offline in Room DB">
                          <Clock className="w-3 h-3 text-amber-300" />
                        </span>
                      )}
                      {msg.status === 'sending' && (
                        <span className="w-2.5 h-2.5 rounded-full border-2 border-teal-300 border-t-transparent animate-spin inline-block" />
                      )}
                      {msg.status === 'sent' && (
                        <span title="Sent to server">
                          <Check className="w-3 h-3 text-teal-300" />
                        </span>
                      )}
                      {msg.status === 'delivered' && (
                        <span title="Delivered to recipient device">
                          <CheckCheck className="w-3 h-3 text-neutral-300" />
                        </span>
                      )}
                      {msg.status === 'read' && (
                        <span
                          title={readReceiptsEnabled ? "Read by recipient (WebSocket verified)" : "Delivered (Read receipts off)"}
                          className="inline-flex items-center gap-0.5"
                        >
                          {readReceiptsEnabled ? (
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-300 drop-shadow-[0_0_5px_rgba(103,232,249,0.7)]" />
                          ) : (
                            <CheckCheck className="w-3.5 h-3.5 text-neutral-300" />
                          )}
                        </span>
                      )}
                    </span>
                  )}

                  {/* Star / Unstar message button */}
                  <button
                    id={`star-msg-btn-${msg.id}`}
                    type="button"
                    onClick={() => onToggleStarMessage?.(msg.id)}
                    className={`ml-1 transition-opacity ${
                      msg.isStarred
                        ? 'opacity-100 text-amber-300'
                        : 'opacity-70 hover:opacity-100 text-neutral-300 hover:text-amber-300'
                    }`}
                    title={msg.isStarred ? 'Unstar message' : 'Star message'}
                  >
                    <Star className={`w-3.5 h-3.5 ${msg.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>

                  {/* Copy message button */}
                  <button
                    id={`copy-msg-btn-${msg.id}`}
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(msg.text);
                      setCopiedMsgId(msg.id);
                      setTimeout(() => setCopiedMsgId(null), 1500);
                    }}
                    className="ml-1 opacity-75 hover:opacity-100 text-neutral-300 hover:text-white transition-opacity"
                    title="Copy message"
                  >
                    {copiedMsgId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-teal-300" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Crypto Inspector Button */}
                  <button
                    id={`inspect-crypto-btn-${msg.id}`}
                    type="button"
                    onClick={() => onInspectMessage(msg)}
                    className="ml-0.5 opacity-75 hover:opacity-100 text-neutral-300 hover:text-white transition-opacity"
                    title="Inspect AES-256-GCM cipher payload"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {(isTyping || peerIsTyping || (contact.id === 'contact_gemini' && isAiTyping)) && (
          <div className="flex items-center gap-2 text-xs text-neutral-400 py-1 animate-in fade-in">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-teal-500/30 shrink-0">
              <img src={contact.avatar} alt="Typing" className="w-full h-full object-cover" />
            </div>
            <div className="p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
              {contact.id === 'contact_gemini' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                  <span className="text-teal-300 font-medium text-xs">Gemini 3.8 Flash is analyzing...</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-neutral-400 ml-1 text-xs">
                    {contact.isGroup ? 'A group member is typing...' : `${contact.name} is typing...`}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Security Inquiry Prompts for Gemini Assistant */}
      {contact.id === 'contact_gemini' && (
        <div className="px-3 pt-2 pb-1.5 bg-neutral-900/90 border-t border-neutral-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-[11px]">
          <span className="text-neutral-400 shrink-0 flex items-center gap-1 font-mono text-[10px] mr-1">
            <Sparkles className="w-3 h-3 text-teal-400" /> Prompts:
          </span>
          {[
            { label: '🛡️ Explain AES-256-GCM', text: 'How does AES-256-GCM provide authenticated encryption and protect my messages from tampering?' },
            { label: '🔄 Double Ratchet', text: 'Explain how the Double Ratchet protocol provides perfect forward secrecy and self-healing keys.' },
            { label: '📦 Offline Sync', text: 'How does offline message queuing work with Android Room DB and WorkManager?' },
            { label: '🔥 Ephemeral Shredding', text: 'Explain the zeroization and memory-shredding process for self-destructing messages.' },
            { label: '🔐 Keystore StrongBox', text: 'How does Android Keystore StrongBox TEE protect hardware cryptographic key pairs?' },
            { label: '📝 OPSEC Briefing', text: 'Draft an Operational Security (OPSEC) briefing for confidential communications.' },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(item.text, 'text', undefined, undefined, activeEphemeralSec)}
              className="px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white shrink-0 border border-neutral-700/60 transition-colors whitespace-nowrap active:scale-95 cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* AI Assistance Bar (Summarize, Smart Replies, Cryptographic Analysis) */}
      <ChatAIBar
        contact={contact}
        messages={messages}
        onSelectReply={(replyText) => {
          setInputText(replyText);
        }}
      />

      {/* Message Input Bottom Bar or CipherDroid Not Installed Alert */}
      {contact.hasCipherDroid === false ? (
        <div
          id="cipherdroid-not-installed-bottom-bar"
          className="p-4 bg-neutral-900 border-t border-neutral-800 shrink-0 text-center space-y-2.5 animate-in fade-in"
        >
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-amber-400">
            <Lock className="w-4 h-4" />
            <span>Messaging Restricted: Recipient Does Not Have CipherDroid</span>
          </div>
          <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
            CipherDroid enforces strict zero-knowledge end-to-end encryption (AES-256-GCM / Tink Hardware Keystore). Messages cannot be delivered to standard phones or non-CipherDroid apps.
          </p>
          <button
            type="button"
            onClick={() => {
              const link = `https://cipherdroid.app/invite?ref=${encodeURIComponent(contact.name)}`;
              if (navigator.clipboard) {
                navigator.clipboard.writeText(link);
              }
              alert(`CipherDroid installation link for ${contact.name} copied to clipboard!`);
            }}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-semibold inline-flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-black" />
            Share CipherDroid App Invite Link
          </button>
        </div>
      ) : isRecordingVoiceNote ? (
        <VoiceNoteRecorder
          onCancel={() => setIsRecordingVoiceNote(false)}
          onSendVoiceNote={handleSendVoiceNote}
        />
      ) : (
        <form
          id="message-input-form"
          onSubmit={handleSend}
          className="p-3 bg-neutral-900 border-t border-neutral-800 shrink-0 flex items-center gap-1.5 sm:gap-2"
        >
          {/* Attach Media (Images, Videos, View Once) */}
          <button
            id="attach-media-btn"
            type="button"
            onClick={onOpenMediaModal}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-teal-400 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Attach encrypted photo, video, or view-once media"
          >
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Emoji & GIF Picker Button */}
          <button
            id="open-emoji-gif-btn"
            type="button"
            onClick={() => setIsEmojiPickerOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-teal-400 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Emojis and encrypted GIFs"
          >
            <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Share Real-Time Location */}
          <button
            id="share-location-btn"
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-teal-400 flex items-center justify-center transition-colors shrink-0 cursor-pointer hidden sm:flex"
            title="Share real-time GPS location (AES-256-GCM)"
          >
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Self-Destruct Timer Quick Toggle */}
          <button
            type="button"
            onClick={() => setShowEphemeralMenu(!showEphemeralMenu)}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
              activeEphemeralSec > 0
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'
            }`}
            title={activeEphemeralSec > 0 ? `Self-destruct timer: ${activeEphemeralSec}s` : 'Set self-destruct timer'}
          >
            <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Text Input with Draft Auto-Saving */}
          <div className="flex-1 relative">
            <input
              id="chat-message-input"
              type="text"
              value={inputText}
              onChange={(e) => {
                const val = e.target.value;
                setInputText(val);
                latestInputRef.current = val;
                if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
                draftSaveTimeoutRef.current = setTimeout(() => {
                  if (onSaveDraftRef.current) onSaveDraftRef.current(val, contact.id);
                }, 350);
                websocketService.sendTyping(contact.id, true);
                if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                typingTimerRef.current = setTimeout(() => {
                  websocketService.sendTyping(contact.id, false);
                }, 2500);
              }}
              placeholder={
                currentNetwork === 'OFFLINE'
                  ? 'Type message (will queue in Room DB)...'
                  : activeEphemeralSec > 0
                  ? `Type self-destructing message (${activeEphemeralSec}s)...`
                  : 'Encrypt message (AES-256-GCM)...'
              }
              className="w-full pl-3 sm:pl-4 pr-10 py-2 sm:py-2.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-teal-500 text-xs sm:text-sm"
            />
            {activeEphemeralSec > 0 && (
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-mono text-[11px] font-bold"
                title={`Permanently deleted ${activeEphemeralSec}s after expiry`}
              >
                {activeEphemeralSec}s
              </span>
            )}
          </div>

          {/* Schedule Message button (when input has text) */}
          {inputText.trim() && (
            <button
              id="schedule-message-btn"
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-teal-400 border border-neutral-700/60 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title="Schedule encrypted message for future dispatch"
            >
              <Clock className="w-4 h-4 text-teal-400" />
            </button>
          )}

          {/* Send or Unlimited Voice Note Record Button */}
          {inputText.trim() ? (
            <button
              id="send-message-btn"
              type="submit"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center transition-all shadow-md shrink-0 cursor-pointer"
              title="Encrypt and send"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              id="record-voice-note-btn"
              type="button"
              onClick={() => setIsRecordingVoiceNote(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-teal-600/90 hover:bg-teal-500 text-white flex items-center justify-center transition-all shadow-md shrink-0 cursor-pointer"
              title="Record encrypted voice note (No duration limit)"
            >
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </form>
      )}

      {/* Emoji & GIF Picker Modal */}
      <EmojiGifPicker
        isOpen={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
        onSelectEmoji={(emoji) => {
          const updated = inputText + emoji;
          setInputText(updated);
          latestInputRef.current = updated;
          if (onSaveDraftRef.current) onSaveDraftRef.current(updated, contact.id);
        }}
        onSelectGif={(gifUrl, title) => {
          handleSendGif(gifUrl, title);
        }}
      />

      {/* Schedule Message Modal */}
      <ScheduleMessageModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        messageText={inputText}
        onScheduleMessage={handleConfirmSchedule}
      />

      {/* View-Once Media Modal */}
      <ViewOnceModal
        isOpen={!!activeViewOnceMsg}
        onClose={() => {
          if (activeViewOnceMsg && onOpenViewOnce) {
            onOpenViewOnce(activeViewOnceMsg);
          }
          setActiveViewOnceMsg(null);
        }}
        mediaUrl={activeViewOnceMsg?.mediaUrl || ''}
        mediaType={activeViewOnceMsg?.mediaType === 'video' ? 'video' : 'image'}
        caption={activeViewOnceMsg?.mediaCaption}
      />

      {/* Scheduled Messages List / Management Modal */}
      {showScheduledListModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-semibold text-white">Scheduled Messages</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduledListModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {scheduledMessages.filter((s) => s.chatId === contact.id).length === 0 ? (
                <p className="text-neutral-400 text-xs text-center py-6">No scheduled messages for {contact.name}.</p>
              ) : (
                scheduledMessages
                  .filter((s) => s.chatId === contact.id)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="text-neutral-200 font-medium truncate">{item.text}</p>
                        <p className="text-[10px] text-teal-400 font-mono">
                          Dispatch: {new Date(item.scheduledFor).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onCancelScheduledMessage?.(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 text-[11px] shrink-0"
                      >
                        Cancel
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Location Share Modal */}
      <LocationShareModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        contactName={contact.name}
        onShareLocation={(locationData) => {
          onSendMessage(
            `[LIVE LOCATION] Coordinates: ${locationData.latitude.toFixed(4)}°, ${locationData.longitude.toFixed(4)}°`,
            'location',
            undefined,
            undefined,
            undefined,
            locationData
          );
        }}
      />
    </div>
  );
};

