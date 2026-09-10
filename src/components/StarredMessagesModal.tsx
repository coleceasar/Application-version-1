/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Star,
  X,
  Search,
  MessageSquare,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Image as ImageIcon,
  MapPin,
  Clock,
} from 'lucide-react';
import { Message, Contact } from '../types';

interface StarredMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Record<string, Message[]>;
  contacts: Contact[];
  activeChatId?: string | null;
  onToggleStarMessage: (messageId: string, chatId: string) => void;
  onSelectChat?: (contactId: string) => void;
}

export const StarredMessagesModal: React.FC<StarredMessagesModalProps> = ({
  isOpen,
  onClose,
  messages,
  contacts,
  activeChatId,
  onToggleStarMessage,
  onSelectChat,
}) => {
  const [filterScope, setFilterScope] = useState<'current' | 'all'>(
    activeChatId ? 'current' : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Gather all starred messages
  const starredList: { msg: Message; chat: Contact | undefined; chatId: string }[] = [];

  Object.entries(messages || {}).forEach(([chatId, chatMsgs]) => {
    if (filterScope === 'current' && activeChatId && chatId !== activeChatId) {
      return;
    }
    const contact = (contacts || []).find((c) => c && c.id === chatId);
    const msgsList: Message[] = Array.isArray(chatMsgs) ? chatMsgs : [];
    msgsList.forEach((m: Message) => {
      if (m && m.isStarred && !m.isBurned) {
        starredList.push({ msg: m, chat: contact, chatId });
      }
    });
  });

  // Sort descending by timestamp
  starredList.sort((a, b) => b.msg.timestamp - a.msg.timestamp);

  const filteredStarred = starredList.filter(({ msg, chat }) => {
    const textMatch = msg.text && msg.text.toLowerCase().includes(searchQuery.toLowerCase());
    const senderMatch = msg.senderName && msg.senderName.toLowerCase().includes(searchQuery.toLowerCase());
    const chatMatch = chat && chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    return textMatch || senderMatch || chatMatch;
  });

  const handleJumpToChat = (chatId: string) => {
    if (onSelectChat) {
      onSelectChat(chatId);
    }
    onClose();
  };

  const activeContact = contacts.find((c) => c.id === activeChatId);

  return (
    <div
      id="starred-messages-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in"
    >
      <div
        id="starred-messages-card"
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Starred Messages
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {starredList.length}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Bookmarked cryptographic transmissions
              </p>
            </div>
          </div>
          <button
            id="close-starred-messages-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter controls */}
        <div className="p-4 border-b border-neutral-800 space-y-3 bg-neutral-950/60">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-starred-messages"
              type="text"
              placeholder="Search starred messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 focus:border-amber-500/50 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors"
            />
          </div>

          {activeChatId && (
            <div className="flex items-center gap-2 text-xs">
              <button
                id="filter-starred-current-chat"
                onClick={() => setFilterScope('current')}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${
                  filterScope === 'current'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'text-neutral-400 border-transparent hover:bg-neutral-800'
                }`}
              >
                In this chat ({activeContact?.name || 'Chat'})
              </button>
              <button
                id="filter-starred-all-chats"
                onClick={() => setFilterScope('all')}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${
                  filterScope === 'all'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'text-neutral-400 border-transparent hover:bg-neutral-800'
                }`}
              >
                Across all chats
              </button>
            </div>
          )}
        </div>

        {/* Starred Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredStarred.length === 0 ? (
            <div className="text-center py-16 text-neutral-500 space-y-3">
              <Star className="w-12 h-12 mx-auto stroke-[1.2] text-neutral-700" />
              <div className="space-y-1">
                <p className="text-sm text-neutral-400 font-medium">
                  No starred messages found
                </p>
                <p className="text-xs text-neutral-600 max-w-xs mx-auto">
                  Hover or tap on any message in a chat and click the Star icon to bookmark it here for quick reference.
                </p>
              </div>
            </div>
          ) : (
            filteredStarred.map(({ msg, chat, chatId }) => {
              const timeString = new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const dateString = new Date(msg.timestamp).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={msg.id}
                  id={`starred-msg-${msg.id}`}
                  className="p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800 hover:border-amber-500/30 transition-all space-y-2.5 group"
                >
                  {/* Message Meta Info */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {msg.isSelf ? 'You' : msg.senderName}
                      </span>
                      {chat && (
                        <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                          in <span className="text-teal-400 font-medium">{chat.name}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{dateString}, {timeString}</span>
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800/80 text-xs text-neutral-200">
                    {msg.mediaType === 'image' && (
                      <div className="flex items-center gap-2 text-teal-400 mb-1 font-mono text-[11px]">
                        <ImageIcon className="w-4 h-4" />
                        <span>Encrypted Image Attachment</span>
                      </div>
                    )}
                    {msg.mediaType === 'location' && (
                      <div className="flex items-center gap-2 text-amber-400 mb-1 font-mono text-[11px]">
                        <MapPin className="w-4 h-4" />
                        <span>Live Location Coordinates</span>
                      </div>
                    )}
                    <p className="leading-relaxed break-words whitespace-pre-wrap">
                      {msg.text}
                    </p>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-neutral-500 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-teal-400" />
                      AES-256-GCM Verified
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        id={`unstar-btn-${msg.id}`}
                        onClick={() => onToggleStarMessage(msg.id, chatId)}
                        title="Remove star"
                        className="px-2.5 py-1 rounded-lg text-amber-400 hover:text-neutral-400 hover:bg-neutral-800 text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        Unstar
                      </button>

                      <button
                        id={`jump-to-chat-${msg.id}`}
                        onClick={() => handleJumpToChat(chatId)}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                        View Chat
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
