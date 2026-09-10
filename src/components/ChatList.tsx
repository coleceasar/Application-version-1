/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Wifi,
  Radio,
  Search,
  CheckCheck,
  Check,
  Clock,
  MessageSquare,
  Phone,
  Settings,
  EyeOff,
  Layers,
  Sparkles,
  Bot,
  Download,
  Users,
  Moon,
  Sun,
  UserPlus,
  QrCode,
  Archive,
  ArchiveRestore,
  Star,
  Contact as ContactIcon,
  ArrowLeft,
} from 'lucide-react';
import { Contact, Message, NetworkType, CallRecord } from '../types';
import { CallsTab } from './CallsTab';
import { GeminiAssistantTab } from './GeminiAssistantTab';
import { websocketService } from '../services/websocketService';
import { X } from 'lucide-react';

interface ChatListProps {
  contacts: Contact[];
  messages?: Record<string, Message[]>;
  activeContactId: string | null;
  onSelectContact: (contactId: string, messageId?: string) => void;
  currentNetwork: NetworkType;
  onOpenNetworkDrawer: () => void;
  onOpenSecurityAudit: () => void;
  onLockApp: () => void;
  queuedCount: number;
  onOpenSettings: () => void;
  onActivateStealthMode: () => void;
  onStartCall: (contact: Contact, type: 'voice' | 'video') => void;
  callHistory: CallRecord[];
  initialTab?: 'chats' | 'calls' | 'gemini';
  onOpenInstallModal?: () => void;
  onOpenCreateGroup?: () => void;
  onToggleTheme?: () => void;
  theme?: 'dark' | 'light';
  onOpenQRScanner?: () => void;
  onOpenPhoneContacts?: () => void;
  onOpenStarredMessages?: () => void;
  onToggleArchiveContact?: (contactId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  contacts = [],
  messages = {},
  activeContactId,
  onSelectContact,
  currentNetwork,
  onOpenNetworkDrawer,
  onOpenSecurityAudit,
  onLockApp,
  queuedCount,
  onOpenSettings,
  onActivateStealthMode,
  onStartCall,
  callHistory = [],
  initialTab = 'chats',
  onOpenInstallModal,
  onOpenCreateGroup,
  onToggleTheme,
  theme = 'dark',
  onOpenQRScanner,
  onOpenPhoneContacts,
  onOpenStarredMessages,
  onToggleArchiveContact,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'contacts' | 'messages'>('all');
  const [bottomTab, setBottomTab] = useState<'chats' | 'calls' | 'gemini'>(initialTab);
  const [typingContacts, setTypingContacts] = useState<Record<string, boolean>>({});
  const [viewingArchived, setViewingArchived] = useState(false);

  // Subscribe to WebSocket typing notifications
  React.useEffect(() => {
    const unsub = websocketService.onTyping((payload) => {
      setTypingContacts((prev) => ({
        ...prev,
        [payload.chatId]: payload.isTyping,
      }));
    });
    return () => unsub();
  }, []);

  const safeContacts = contacts || [];
  const archivedContacts = safeContacts.filter((c) => Boolean(c.isArchived));
  const activeChatContacts = safeContacts.filter((c) => !c.isArchived);

  // Filter contacts based on current view (archived vs active inbox) and search query
  const displayContactsPool = viewingArchived ? archivedContacts : activeChatContacts;

  const filteredContacts = displayContactsPool.filter(
    (c) =>
      c &&
      ((c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.handle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.role || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const matchedMessages = React.useMemo(() => {
    if (!messages || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const results: Array<{ message: Message; contact: Contact }> = [];

    Object.entries(messages).forEach(([chatId, msgList]) => {
      const contact = contacts.find((c) => c.id === chatId);
      if (!contact || !Array.isArray(msgList)) return;
      (msgList as Message[]).forEach((m) => {
        if (!m.isBurned && m.text && m.text.toLowerCase().includes(q)) {
          results.push({ message: m, contact });
        }
      });
    });

    return results.sort((a, b) => b.message.timestamp - a.message.timestamp);
  }, [messages, contacts, searchQuery]);

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="bg-teal-500/30 text-teal-200 px-1 py-0.2 rounded font-semibold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const formatLastTime = (timestamp: number) => {
    const diffMin = Math.round((Date.now() - timestamp) / (1000 * 60));
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.round(diffHours / 24)}d`;
  };

  const totalUnread = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div id="chatlist-container" className="flex flex-col h-full bg-neutral-950 text-neutral-100 relative">
      {/* Top App Bar (Material 3) */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-neutral-100 flex items-center gap-1.5">
                <span>F& E</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  AES-256
                </span>
              </h1>
              <p className="text-[11px] text-neutral-400">Signal Protocol & Tink E2EE</p>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-1.5">
            {/* Install on Phone / Download PWA Button */}
            {onOpenInstallModal && (
              <button
                id="topbar-install-btn"
                type="button"
                onClick={onOpenInstallModal}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30 flex items-center gap-1.5 transition-all shadow-sm"
                title="Download app to your phone (Android / iOS PWA)"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline text-[11px]">Install</span>
              </button>
            )}

            {/* Hide App / Stealth Disguise Button */}
            <button
              id="topbar-hide-app-btn"
              type="button"
              onClick={onActivateStealthMode}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-amber-400 flex items-center justify-center transition-colors"
              title="Hide App / Calculator Stealth Disguise"
            >
              <EyeOff className="w-4 h-4" />
            </button>

            {/* Network pill */}
            <button
              id="topbar-network-btn"
              type="button"
              onClick={onOpenNetworkDrawer}
              className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                currentNetwork === 'OFFLINE'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-teal-400 border-neutral-700'
              }`}
              title="Click to switch network or view API telemetry"
            >
              {currentNetwork === 'WIFI' && <Wifi className="w-3.5 h-3.5" />}
              {currentNetwork === 'OFFLINE' ? (
                <Radio className="w-3.5 h-3.5 rotate-45" />
              ) : (
                <span className="text-[10px] font-bold">{currentNetwork}</span>
              )}
              {queuedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                id="topbar-theme-btn"
                type="button"
                onClick={onToggleTheme}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-amber-400 flex items-center justify-center transition-colors"
                title="Toggle Dark / Light Mode"
              >
                {theme === 'light' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-teal-400" />
                )}
              </button>
            )}

            {/* Lock App (Biometric prompt test) */}
            <button
              id="lock-app-btn"
              type="button"
              onClick={onLockApp}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
              title="Lock app with Biometric / Passkey"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Settings Modal Button (Keystore, Permissions, PWA Download, Audit) */}
            <button
              id="topbar-settings-btn"
              type="button"
              onClick={onOpenSettings}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-teal-400 flex items-center justify-center transition-colors"
              title="Settings & App Configuration"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar & Actions (Only shown on chats tab) */}
        {bottomTab === 'chats' && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="search-chats-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search encrypted contacts or messages..."
                  className="w-full pl-9 pr-8 py-2 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-teal-500 text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-0.5 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {onOpenCreateGroup && (
                <button
                  id="btn-open-create-group"
                  type="button"
                  onClick={onOpenCreateGroup}
                  className="px-2.5 py-2 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-teal-400 hover:text-teal-300 border border-neutral-700 flex items-center gap-1.5 text-xs font-semibold shrink-0 transition-colors shadow-sm"
                  title="Create Encrypted Multi-Party Group"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Group</span>
                </button>
              )}
            </div>

            {/* Quick Action Navigation Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
              {onOpenQRScanner && (
                <button
                  id="quick-action-qr-scan"
                  type="button"
                  onClick={onOpenQRScanner}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-teal-400 border border-neutral-800 flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5 text-teal-400" />
                  <span>Scan QR</span>
                </button>
              )}

              {onOpenPhoneContacts && (
                <button
                  id="quick-action-phone-contacts"
                  type="button"
                  onClick={onOpenPhoneContacts}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-teal-400 border border-neutral-800 flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <ContactIcon className="w-3.5 h-3.5 text-teal-400" />
                  <span>Phone Contacts</span>
                </button>
              )}

              {onOpenStarredMessages && (
                <button
                  id="quick-action-starred"
                  type="button"
                  onClick={onOpenStarredMessages}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 border border-neutral-800 flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span>Starred</span>
                </button>
              )}

              {archivedContacts.length > 0 && (
                <button
                  id="quick-action-toggle-archived"
                  type="button"
                  onClick={() => setViewingArchived(!viewingArchived)}
                  className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 shrink-0 transition-colors ${
                    viewingArchived
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-semibold'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5 text-teal-400" />
                  <span>Archived ({archivedContacts.length})</span>
                </button>
              )}
            </div>

            {/* Search Filter Chips when query is active */}
            {searchQuery.trim().length > 0 && (
              <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto text-[11px]">
                <button
                  type="button"
                  onClick={() => setSearchFilter('all')}
                  className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                    searchFilter === 'all'
                      ? 'bg-teal-500 text-neutral-950 font-semibold'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                  }`}
                >
                  All ({filteredContacts.length + matchedMessages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSearchFilter('contacts')}
                  className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                    searchFilter === 'contacts'
                      ? 'bg-teal-500 text-neutral-950 font-semibold'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                  }`}
                >
                  Contacts ({filteredContacts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSearchFilter('messages')}
                  className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                    searchFilter === 'messages'
                      ? 'bg-teal-500 text-neutral-950 font-semibold'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                  }`}
                >
                  Messages ({matchedMessages.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Offline Staging Warning Banner */}
      {queuedCount > 0 && (
        <div
          id="offline-queued-banner"
          onClick={onOpenNetworkDrawer}
          className="bg-amber-950/70 border-b border-amber-800/60 px-4 py-2 text-xs text-amber-200 flex items-center justify-between cursor-pointer hover:bg-amber-950 transition-colors shrink-0"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>
              <strong>{queuedCount}</strong> message(s) stored in Room Outbox.
            </span>
          </div>
          <span className="text-[10px] font-semibold text-amber-300 underline">View Sync</span>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {bottomTab === 'chats' && (
          <div>
            {/* Archived Chats Subheader Banner when viewing archived */}
            {viewingArchived && (
              <div className="p-3 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                <button
                  id="back-to-inbox-btn"
                  type="button"
                  onClick={() => setViewingArchived(false)}
                  className="flex items-center gap-2 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Main Inbox</span>
                </button>
                <span className="text-xs font-mono text-neutral-400">
                  Archived Chats ({archivedContacts.length})
                </span>
              </div>
            )}

            {/* Archived Chats Top Row when in main inbox and archived chats exist */}
            {!viewingArchived && archivedContacts.length > 0 && !searchQuery.trim() && (
              <div
                id="archived-chats-row"
                onClick={() => setViewingArchived(true)}
                className="p-3.5 border-b border-neutral-900 hover:bg-neutral-900/60 cursor-pointer flex items-center justify-between transition-colors bg-neutral-950/40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-teal-400">
                    <Archive className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-200">
                      Archived Conversations
                    </h4>
                    <p className="text-[11px] text-neutral-400">
                      Encrypted chats moved out of main view
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  {archivedContacts.length}
                </span>
              </div>
            )}

            {/* If searching and zero results */}
            {searchQuery.trim().length > 0 &&
              filteredContacts.length === 0 &&
              matchedMessages.length === 0 && (
                <div className="p-8 text-center space-y-2 text-neutral-400">
                  <Search className="w-8 h-8 text-neutral-600 mx-auto" />
                  <p className="text-sm font-semibold text-neutral-200">No encrypted matches found</p>
                  <p className="text-xs text-neutral-500">
                    No contacts or message contents match &quot;{searchQuery}&quot;.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-xs text-teal-400 hover:underline"
                  >
                    Clear search query
                  </button>
                </div>
              )}

            {/* Section 1: Contacts (if matches exist and filter allows) */}
            {(searchFilter === 'all' || searchFilter === 'contacts') && filteredContacts.length > 0 && (
              <div>
                {searchQuery.trim().length > 0 && (
                  <div className="px-4 py-1.5 bg-neutral-900/60 text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                    Contacts ({filteredContacts.length})
                  </div>
                )}
                <div className="divide-y divide-neutral-900">
                  {filteredContacts.map((contact) => {
                    const isActive = contact.id === activeContactId;

                    return (
                      <div
                        key={contact.id}
                        id={`contact-item-${contact.id}`}
                        onClick={() => onSelectContact(contact.id)}
                        className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors group ${
                          isActive
                            ? 'bg-teal-950/40 border-l-4 border-teal-500'
                            : 'hover:bg-neutral-900/60'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <img
                            src={contact.avatar}
                            alt={contact.name}
                            className="w-12 h-12 rounded-full object-cover border border-neutral-800"
                          />
                          {contact.isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-teal-400 border-2 border-neutral-950" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5 truncate">
                              <h4 className="text-sm font-semibold text-neutral-100 truncate">
                                {searchQuery.trim() ? highlightMatch(contact.name, searchQuery) : contact.name}
                              </h4>
                              {contact.isGroup && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                                  <Users className="w-2.5 h-2.5" />
                                  Group
                                </span>
                              )}
                              {contact.id === 'contact_gemini' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gradient-to-r from-teal-500/20 to-indigo-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  AI
                                </span>
                              )}
                              {contact.isVerified && contact.id !== 'contact_gemini' && (
                                <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                              )}
                              {contact.hasCipherDroid === false && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                                  No App
                                </span>
                              )}
                            </div>
                            {contact.lastMessage && (
                              <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                                {formatLastTime(contact.lastMessage.timestamp)}
                              </span>
                            )}
                          </div>

                          {typingContacts[contact.id] ? (
                            <p className="text-xs text-teal-400 font-medium flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" />
                              <span>typing...</span>
                            </p>
                          ) : (
                            <p className="text-xs text-neutral-400 truncate flex items-center gap-1">
                              {contact.lastMessage?.isSelf && (
                                <span>
                                  {contact.lastMessage.status === 'queued_offline' ? (
                                    <Clock className="w-3 h-3 text-amber-400 inline mr-0.5" />
                                  ) : contact.lastMessage.status === 'read' ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-cyan-400 inline mr-0.5" />
                                  ) : (
                                    <Check className="w-3 h-3 text-neutral-400 inline mr-0.5" />
                                  )}
                                </span>
                              )}
                              <span>{contact.lastMessage ? contact.lastMessage.text : contact.role}</span>
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                              {contact.deviceInfo.keystoreLevel}
                            </span>
                          </div>
                        </div>

                        {/* Right side actions & badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Archive / Unarchive Button */}
                          {onToggleArchiveContact && (
                            <button
                              id={`archive-toggle-btn-${contact.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleArchiveContact(contact.id);
                              }}
                              title={contact.isArchived ? 'Unarchive chat' : 'Archive chat'}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-teal-400 hover:bg-neutral-800 transition-colors opacity-80 hover:opacity-100"
                            >
                              {contact.isArchived ? (
                                <ArchiveRestore className="w-4 h-4 text-teal-400" />
                              ) : (
                                <Archive className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Unread badge */}
                          {contact.unreadCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {contact.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 2: Messages Content Search Results */}
            {searchQuery.trim().length > 0 &&
              (searchFilter === 'all' || searchFilter === 'messages') &&
              matchedMessages.length > 0 && (
                <div className="mt-2">
                  <div className="px-4 py-1.5 bg-neutral-900/60 text-[10px] uppercase font-bold tracking-wider text-neutral-400 flex items-center justify-between">
                    <span>Matching Messages ({matchedMessages.length})</span>
                    <span className="text-[9px] lowercase font-normal text-neutral-500">tap to jump</span>
                  </div>

                  <div className="divide-y divide-neutral-900">
                    {matchedMessages.map(({ message, contact }) => (
                      <div
                        key={message.id}
                        id={`search-result-msg-${message.id}`}
                        onClick={() => onSelectContact(contact.id, message.id)}
                        className="p-3.5 hover:bg-neutral-900/70 cursor-pointer transition-colors flex items-start gap-3"
                      >
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="w-9 h-9 rounded-full object-cover border border-neutral-800 shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h5 className="text-xs font-semibold text-neutral-200 truncate">
                              {contact.name}
                            </h5>
                            <span className="text-[10px] font-mono text-neutral-500">
                              {formatLastTime(message.timestamp)}
                            </span>
                          </div>

                          <p className="text-xs text-neutral-300 leading-snug line-clamp-2">
                            {highlightMatch(message.text, searchQuery)}
                          </p>

                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-neutral-500">
                            <span className="font-mono bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800">
                              {message.isSelf ? 'Outgoing' : 'Incoming'}
                            </span>
                            {message.isSelf && (
                              <span className="flex items-center gap-1 text-cyan-400">
                                {message.status === 'read' ? (
                                  <>
                                    <CheckCheck className="w-3 h-3 text-cyan-400" />
                                    <span>Read</span>
                                  </>
                                ) : message.status === 'delivered' ? (
                                  <>
                                    <CheckCheck className="w-3 h-3 text-neutral-400" />
                                    <span>Delivered</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3 h-3 text-neutral-400" />
                                    <span>Sent</span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {bottomTab === 'calls' && (
          <CallsTab
            contacts={contacts}
            onStartCall={onStartCall}
            callHistory={callHistory}
          />
        )}

        {bottomTab === 'gemini' && (
          <GeminiAssistantTab
            onInsertIntoChat={(text) => {
              setBottomTab('chats');
              if (!activeContactId && contacts.length > 0) {
                onSelectContact(contacts[0].id);
              }
            }}
          />
        )}
      </div>

      {/* Bottom Navigation Bar: Chats, Calls, and Gemini AI Assistant */}
      <div className="h-16 px-4 bg-neutral-900 border-t border-neutral-800 shrink-0 flex items-center justify-around text-xs">
        <button
          id="nav-chats-btn"
          type="button"
          onClick={() => {
            setBottomTab('chats');
            if (activeContactId === 'contact_gemini') {
              const friend = contacts.find((c) => c.id !== 'contact_gemini');
              if (friend) onSelectContact(friend.id);
            }
          }}
          className={`flex-1 flex flex-col items-center gap-1 transition-colors ${
            bottomTab === 'chats' && activeContactId !== 'contact_gemini'
              ? 'text-teal-400 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div
            className={`px-4 py-1 rounded-full relative ${
              bottomTab === 'chats' && activeContactId !== 'contact_gemini'
                ? 'bg-teal-500/20'
                : 'bg-transparent'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-teal-400 border border-neutral-900" />
            )}
          </div>
          <span className="text-[11px]">Chats</span>
        </button>

        <button
          id="nav-calls-btn"
          type="button"
          onClick={() => setBottomTab('calls')}
          className={`flex-1 flex flex-col items-center gap-1 transition-colors ${
            bottomTab === 'calls' ? 'text-teal-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div
            className={`px-4 py-1 rounded-full ${
              bottomTab === 'calls' ? 'bg-teal-500/20' : 'bg-transparent'
            }`}
          >
            <Phone className="w-4 h-4" />
          </div>
          <span className="text-[11px]">Calls</span>
        </button>

        <button
          id="nav-gemini-btn"
          type="button"
          onClick={() => {
            setBottomTab('chats');
            onSelectContact('contact_gemini');
          }}
          className={`flex-1 flex flex-col items-center gap-1 transition-colors ${
            activeContactId === 'contact_gemini'
              ? 'text-teal-400 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div
            className={`px-4 py-1 rounded-full relative ${
              activeContactId === 'contact_gemini'
                ? 'bg-teal-500/20 text-teal-400'
                : 'bg-transparent text-neutral-400'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          </div>
          <span className="text-[11px]">Gemini AI</span>
        </button>
      </div>
    </div>
  );
};
