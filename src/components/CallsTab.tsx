/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  ShieldCheck,
  Plus,
  Lock,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { Contact, CallRecord } from '../types';

interface CallsTabProps {
  contacts: Contact[];
  onStartCall: (contact: Contact, type: 'voice' | 'video') => void;
  callHistory: CallRecord[];
}

export const CallsTab: React.FC<CallsTabProps> = ({
  contacts = [],
  onStartCall,
  callHistory = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [showNewCallModal, setShowNewCallModal] = useState(false);

  const filteredHistory = (callHistory || []).filter((c) => {
    if (!c) return false;
    const matchesSearch = (c.contactName || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === 'missed') {
      return matchesSearch && c.direction === 'missed';
    }
    return matchesSearch;
  });

  const formatTimestamp = (ts: number) => {
    const diff = Math.round((Date.now() - ts) / (1000 * 60));
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    const hours = Math.round(diff / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return 'Missed';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div id="calls-tab-container" className="flex flex-col h-full bg-neutral-950 text-neutral-100 relative">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100">Encrypted Calls</h2>
              <p className="text-[11px] text-neutral-400">WebRTC DTLS-SRTP 256-bit AES-GCM</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="new-call-fab-btn"
              type="button"
              onClick={() => setShowNewCallModal(true)}
              className="px-3 py-1.5 rounded-full bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Call</span>
            </button>
          </div>
        </div>

        {/* Filter chips & Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search call logs..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-teal-500 text-xs"
            />
          </div>

          <div className="flex rounded-xl bg-neutral-950 p-0.5 border border-neutral-800">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filter === 'all' ? 'bg-neutral-800 text-teal-400' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('missed')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filter === 'missed' ? 'bg-neutral-800 text-red-400' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Missed
            </button>
          </div>
        </div>
      </div>

      {/* Call History List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-900">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-neutral-500 space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-400">No recent call records</p>
              <p className="text-xs text-neutral-500 mt-1">
                Voice and video calls are protected with peer-to-peer DTLS-SRTP encryption.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewCallModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-teal-400 border border-neutral-800 text-xs font-medium"
            >
              Start an Encrypted Call
            </button>
          </div>
        ) : (
          filteredHistory.map((call) => {
            const contact = contacts.find((c) => c.id === call.contactId);
            return (
              <div
                key={call.id}
                className="p-3.5 hover:bg-neutral-900/50 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={call.contactAvatar}
                      alt={call.contactName}
                      className="w-11 h-11 rounded-full object-cover border border-neutral-800"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                      {call.type === 'video' ? (
                        <Video className="w-3 h-3 text-teal-400" />
                      ) : (
                        <Phone className="w-3 h-3 text-teal-400" />
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-neutral-100 text-xs sm:text-sm">
                        {call.contactName}
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
                      {call.direction === 'incoming' && (
                        <PhoneIncoming className="w-3 h-3 text-teal-400" />
                      )}
                      {call.direction === 'outgoing' && (
                        <PhoneOutgoing className="w-3 h-3 text-neutral-400" />
                      )}
                      {call.direction === 'missed' && (
                        <PhoneMissed className="w-3 h-3 text-red-400" />
                      )}

                      <span className={call.direction === 'missed' ? 'text-red-400' : ''}>
                        {formatDuration(call.durationSeconds)}
                      </span>
                      <span>•</span>
                      <span>{formatTimestamp(call.timestamp)}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Call Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title={`Voice call ${call.contactName}`}
                    onClick={() => {
                      if (contact) onStartCall(contact, 'voice');
                    }}
                    className="w-8 h-8 rounded-full bg-neutral-900 hover:bg-teal-500/20 text-neutral-400 hover:text-teal-300 flex items-center justify-center border border-neutral-800 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title={`Video call ${call.contactName}`}
                    onClick={() => {
                      if (contact) onStartCall(contact, 'video');
                    }}
                    className="w-8 h-8 rounded-full bg-neutral-900 hover:bg-teal-500/20 text-neutral-400 hover:text-teal-300 flex items-center justify-center border border-neutral-800 transition-colors"
                  >
                    <Video className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Call Contact Picker Modal */}
      {showNewCallModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="font-bold text-neutral-100 text-sm">Choose Contact to Call</h3>
              <button
                type="button"
                onClick={() => setShowNewCallModal(false)}
                className="text-xs text-neutral-400 hover:text-neutral-200"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-2.5 rounded-2xl bg-neutral-950/60 hover:bg-neutral-800/80 border border-neutral-800 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-xs text-neutral-100">{contact.name}</div>
                      <div className="text-[10px] text-neutral-400">{contact.role}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCallModal(false);
                        onStartCall(contact, 'voice');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-teal-600 text-neutral-200 hover:text-white text-xs flex items-center gap-1 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Voice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCallModal(false);
                        onStartCall(contact, 'video');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs flex items-center gap-1 transition-colors"
                    >
                      <Video className="w-3 h-3" />
                      <span>Video</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
