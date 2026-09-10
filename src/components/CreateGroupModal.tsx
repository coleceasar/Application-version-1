/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Users,
  Shield,
  Lock,
  Terminal,
  Zap,
  Check,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { Contact } from '../types';

interface CreateGroupModalProps {
  isOpen: boolean;
  contacts?: Contact[];
  availableContacts?: Contact[];
  onClose: () => void;
  onCreateGroup: (newGroup: Contact) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=150&auto=format&fit=crop&q=80',
];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  contacts = [],
  availableContacts,
  onClose,
  onCreateGroup,
}) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const rawContacts = contacts.length > 0 ? contacts : (availableContacts || []);

  // Filter individual contacts (excluding existing groups)
  const individualContacts = (rawContacts || []).filter((c) => c && !c.isGroup);
  const filteredContacts = individualContacts.filter((c) =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.handle || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) =>
      (prev || []).includes(id) ? (prev || []).filter((i) => i !== id) : [...(prev || []), id]
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedContactIds.length === 0) return;

    const randomSafetyNum = Array.from({ length: 12 }, () =>
      Math.floor(10000 + Math.random() * 90000)
    ).join(' ');

    const newGroup: Contact = {
      id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: groupName.trim(),
      handle: `@group.${groupName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      avatar: selectedAvatar,
      role: 'Encrypted Multi-Party Group',
      statusText: description.trim() || 'Group chat protected by Double Ratchet Group protocol',
      isOnline: true,
      lastSeen: 'Active now',
      isVerified: true,
      safetyNumber: randomSafetyNum,
      publicKeyFingerprint: `0x${Array.from({ length: 8 }, () =>
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join('').toUpperCase()}`,
      deviceInfo: {
        model: 'Multi-Device Group Channel',
        androidVersion: 'Encrypted Mesh v2.4',
        keystoreLevel: 'Hardware TEE / StrongBox',
      },
      unreadCount: 0,
      isGroup: true,
      groupMembers: selectedContactIds,
      groupDescription: description.trim(),
      groupAdminId: 'self',
    };

    onCreateGroup(newGroup);
    // Reset state
    setGroupName('');
    setDescription('');
    setSelectedContactIds([]);
    onClose();
  };

  return (
    <div
      id="create-group-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in"
    >
      <div
        id="create-group-card"
        className="w-full max-w-md max-h-[92vh] bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-neutral-100"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Encrypted Group</h2>
              <p className="text-[11px] text-neutral-400">Multi-party AES-256-GCM mesh</p>
            </div>
          </div>
          <button
            id="btn-close-create-group"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* Avatar Selector */}
            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                Group Avatar
              </label>
              <div className="flex items-center gap-3">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(preset)}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                      selectedAvatar === preset
                        ? 'border-teal-400 scale-105 ring-2 ring-teal-500/30'
                        : 'border-neutral-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={preset}
                      alt="Group preset"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover"
                    />
                    {selectedAvatar === preset && (
                      <div className="absolute inset-0 bg-teal-500/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Group Name */}
            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Group Name *
              </label>
              <input
                id="input-group-name"
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Cyber Ops, Family Circle, Project Alpha"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Group Purpose / Topic
              </label>
              <input
                id="input-group-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Confidential operational planning and status"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Select Members */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Select Members * ({selectedContactIds.length} selected)
                </label>
              </div>

              {/* Search contacts */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Contacts checklist */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {filteredContacts.map((contact) => {
                  const isSelected = selectedContactIds.includes(contact.id);
                  return (
                    <div
                      key={contact.id}
                      onClick={() => toggleContact(contact.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-teal-500/10 border-teal-500/40 text-white'
                          : 'bg-neutral-800/50 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-xs font-semibold">{contact.name}</p>
                          <p className="text-[10px] text-neutral-400 font-mono">{contact.handle}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-teal-500 border-teal-400 text-black'
                            : 'border-neutral-600 bg-neutral-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              id="btn-cancel-create-group"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-create-group"
              disabled={!groupName.trim() || selectedContactIds.length === 0}
              className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-neutral-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Create Encrypted Group</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
