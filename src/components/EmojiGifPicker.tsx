/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Search, Sparkles, Film, Smile, ShieldCheck, Flame } from 'lucide-react';

interface EmojiGifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSelectGif: (gifUrl: string, title: string) => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Cyber & Security',
    emojis: ['🔐', '🛡️', '🔑', '⚡', '💻', '🤖', '🛰️', '📡', '🔒', '🔓', '👁️‍🗨️', '🎯', '💾', '📱', '🕵️‍♂️', '🕵️‍♀️', '🧰', '⚠️', '🚨', '🧬'],
  },
  {
    name: 'Smileys & Reactions',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
  },
  {
    name: 'Gestures & Hearts',
    emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🙏', '🤝', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '🔥', '✨', '⭐', '🌟', '💥'],
  },
  {
    name: 'Activities & Objects',
    emojis: ['🎉', '🎊', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🎮', '🕹️', '🎲', '🎯', '🎨', '🚀', '🛸', '🏎️', '✈️', '⏰', '⌛', '⏳', '💡', '🔦', '💣', '🗡️', '⚔️', '📦', '🎁'],
  },
];

const CURATED_GIFS = [
  {
    id: 'gif_1',
    title: 'Matrix Terminal Cipher',
    category: 'Cyber',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    animated: true,
  },
  {
    id: 'gif_2',
    title: 'Hardware Keystore Locked',
    category: 'Cyber',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
    animated: true,
  },
  {
    id: 'gif_3',
    title: 'Mission Accomplished Celebration',
    category: 'Celebration',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    animated: true,
  },
  {
    id: 'gif_4',
    title: 'Security Approved Stamp',
    category: 'Approved',
    url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
    animated: true,
  },
  {
    id: 'gif_5',
    title: 'Cyberpunk Neon Wave',
    category: 'Cyber',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
    animated: true,
  },
  {
    id: 'gif_6',
    title: 'Thumbs Up Verified',
    category: 'Reaction',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    animated: true,
  },
];

export const EmojiGifPicker: React.FC<EmojiGifPickerProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  onSelectGif,
}) => {
  const [activeTab, setActiveTab] = useState<'emoji' | 'gif'>('emoji');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredEmojis = EMOJI_CATEGORIES.map((cat) => ({
    ...cat,
    emojis: cat.emojis.filter((emoji) =>
      searchQuery ? emoji.includes(searchQuery) : true
    ),
  })).filter((cat) => cat.emojis.length > 0);

  const filteredGifs = CURATED_GIFS.filter(
    (g) =>
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      id="emoji-gif-picker-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="emoji-gif-picker-card"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md h-[420px] bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        {/* Header Tabs */}
        <div className="p-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/95 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab('emoji')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'emoji'
                  ? 'bg-teal-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Emojis</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gif')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'gif'
                  ? 'bg-teal-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>GIFs</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-neutral-800/80 bg-neutral-950/50 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'emoji' ? 'Search emojis...' : 'Search encrypted GIFs...'}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {activeTab === 'emoji' ? (
            <div className="space-y-3">
              {filteredEmojis.map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1 font-mono">
                    {cat.name}
                  </h4>
                  <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                    {cat.emojis.map((emoji, eIdx) => (
                      <button
                        key={eIdx}
                        type="button"
                        onClick={() => {
                          onSelectEmoji(emoji);
                        }}
                        className="w-10 h-10 rounded-xl hover:bg-neutral-800 flex items-center justify-center text-xl transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {filteredGifs.map((gif) => (
                <div
                  key={gif.id}
                  onClick={() => {
                    onSelectGif(gif.url, gif.title);
                    onClose();
                  }}
                  className="group relative h-28 rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 cursor-pointer hover:border-teal-500 transition-all"
                >
                  <img
                    src={gif.url}
                    alt={gif.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-80" />
                  <span className="absolute bottom-1.5 left-2 right-2 text-[10px] font-medium text-neutral-200 truncate">
                    {gif.title}
                  </span>
                  <span className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded bg-black/70 text-[9px] font-mono text-teal-400 border border-teal-500/30">
                    GIF
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
