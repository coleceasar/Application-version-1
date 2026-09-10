/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Video,
  Download,
  Trash2,
  Clock,
  QrCode,
  Check,
  Copy,
  Users,
  UserPlus,
  UserCheck,
  Info,
  KeyRound,
  ExternalLink,
  ChevronRight,
  LogOut,
  Mail,
  Smartphone,
} from 'lucide-react';
import { Contact, Message } from '../types';
import { exportLocalChatData } from '../services/googleDriveService';

interface ContactDetailsModalProps {
  isOpen: boolean;
  contact: Contact | null;
  allContacts?: Contact[];
  messages?: Record<string, Message[]>;
  onClose: () => void;
  onOpenSafetyNumber?: () => void;
  onDeleteContact?: (contactId: string) => void;
  onToggleVerifyContact?: (contactId: string) => void;
  onStartCall?: (contact: Contact, type: 'voice' | 'video') => void;
  onClearChat?: (contactId: string) => void;
  onAddMemberToGroup?: (groupId: string, memberContactId: string) => void;
  onLeaveGroup?: (groupId: string) => void;
  onUpdateEphemeralTimer?: (contactId: string, seconds: number) => void;
}

export const ContactDetailsModal: React.FC<ContactDetailsModalProps> = ({
  isOpen,
  contact,
  allContacts = [],
  messages = {},
  onClose,
  onOpenSafetyNumber,
  onDeleteContact,
  onToggleVerifyContact,
  onStartCall,
  onClearChat,
  onAddMemberToGroup,
  onLeaveGroup,
  onUpdateEphemeralTimer,
}) => {
  const [showQr, setShowQr] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSafety, setCopiedSafety] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedNewMember, setSelectedNewMember] = useState('');
  const [ephemeralTimer, setEphemeralTimer] = useState<number>(0);

  if (!isOpen || !contact) return null;

  const chatMessages = (messages && contact.id && messages[contact.id]) ? messages[contact.id] : [];
  const mediaCount = (chatMessages || []).filter((m) => m && m.mediaType !== 'text').length;
  const isGroup = !!contact.isGroup;

  const safeContacts = allContacts || [];
  const groupMemberList = isGroup
    ? (contact.groupMembers || [])
        .map((memberId) => safeContacts.find((c) => c && c.id === memberId))
        .filter(Boolean) as Contact[]
    : [];

  const availableToAdd = isGroup
    ? safeContacts.filter(
        (c) => c && !c.isGroup && !(contact.groupMembers || []).includes(c.id)
      )
    : [];

  const handleCopySafetyNumber = () => {
    navigator.clipboard.writeText(contact.safetyNumber.replace(/\s+/g, ' '));
    setCopiedSafety(true);
    setTimeout(() => setCopiedSafety(false), 2000);
  };

  const handleCopyPublicKey = () => {
    navigator.clipboard.writeText(contact.publicKeyFingerprint);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleExportThisChat = () => {
    exportLocalChatData(allContacts, messages, contact.id);
  };

  const handleAddMember = () => {
    if (!selectedNewMember || !onAddMemberToGroup) return;
    onAddMemberToGroup(contact.id, selectedNewMember);
    setSelectedNewMember('');
    setShowAddMember(false);
  };

  return (
    <div
      id="contact-details-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in"
    >
      <div
        id="contact-details-card"
        className="w-full max-w-md max-h-[90vh] bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-neutral-100"
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-white">
              {isGroup ? 'Group Information' : 'Contact Details'}
            </h2>
          </div>
          <button
            id="btn-close-contact-details"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-sm">
          {/* Hero Profile Block */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <img
                src={contact.avatar}
                alt={contact.name}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-3xl object-cover border-2 border-neutral-700 shadow-xl"
              />
              {contact.isOnline && !isGroup && (
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-teal-500 ring-4 ring-neutral-900" />
              )}
              {contact.isVerified && (
                <div className="absolute -top-1 -right-1 bg-teal-500 text-black p-1 rounded-full shadow-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">{contact.name}</h3>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">{contact.handle}</p>
              <p className="text-xs text-teal-400/90 mt-1 font-medium">{contact.role}</p>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                id="btn-contact-audio-call"
                onClick={() => onStartCall?.(contact, 'voice')}
                className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-700/80 hover:border-teal-500/40 text-neutral-200 hover:text-teal-400 transition-all active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span className="text-[11px] font-medium">Audio</span>
              </button>
              <button
                id="btn-contact-video-call"
                onClick={() => onStartCall?.(contact, 'video')}
                className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-700/80 hover:border-teal-500/40 text-neutral-200 hover:text-teal-400 transition-all active:scale-95"
              >
                <Video className="w-4 h-4" />
                <span className="text-[11px] font-medium">Video</span>
              </button>
              <button
                id="btn-contact-export-chat"
                onClick={handleExportThisChat}
                className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-700/80 hover:border-teal-500/40 text-neutral-200 hover:text-teal-400 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span className="text-[11px] font-medium">Export</span>
              </button>
            </div>
          </div>

          {/* About / Bio */}
          <div className="bg-neutral-800/60 border border-neutral-800 p-3.5 rounded-2xl space-y-1.5">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              {isGroup ? 'Group Description' : 'Status & Bio'}
            </span>
            <p className="text-xs text-neutral-200 leading-relaxed">
              {contact.groupDescription || contact.statusText || 'No bio provided'}
            </p>
          </div>

          {/* Contact Details (Phone, Email) */}
          {!isGroup && (
            <div className="bg-neutral-800/60 border border-neutral-800 p-3.5 rounded-2xl space-y-2.5">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Connection Details
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-300">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Secure Signal/Phone</span>
                  </div>
                  <span className="font-mono text-neutral-200">
                    {contact.phone || '+1 (555) 019-2834'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-300">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Mail className="w-3.5 h-3.5" />
                    <span>PGP / Email</span>
                  </div>
                  <span className="font-mono text-neutral-200">
                    {contact.email || `${contact.handle.replace('@', '')}@cipherdroid.internal`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-300">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last Active</span>
                  </div>
                  <span>{contact.lastSeen}</span>
                </div>
              </div>
            </div>
          )}

          {/* Group Members Section */}
          {isGroup && (
            <div className="bg-neutral-800/60 border border-neutral-800 p-3.5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Members ({groupMemberList.length + 1})
                  </span>
                </div>
                {availableToAdd.length > 0 && (
                  <button
                    id="btn-toggle-add-member"
                    onClick={() => setShowAddMember(!showAddMember)}
                    className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Add Member
                  </button>
                )}
              </div>

              {/* Add Member Dropdown */}
              {showAddMember && (
                <div className="p-3 bg-neutral-900 border border-neutral-700 rounded-xl space-y-2 animate-in fade-in">
                  <label className="text-[11px] text-neutral-400">Select Contact to Add:</label>
                  <div className="flex gap-2">
                    <select
                      id="select-group-member-to-add"
                      value={selectedNewMember}
                      onChange={(e) => setSelectedNewMember(e.target.value)}
                      className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="">Choose a contact...</option>
                      {availableToAdd.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.handle})
                        </option>
                      ))}
                    </select>
                    <button
                      id="btn-confirm-add-member"
                      disabled={!selectedNewMember}
                      onClick={handleAddMember}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {/* Current User */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-400 font-bold text-xs">
                      You
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">You (This Device)</p>
                      <p className="text-[10px] text-neutral-400 font-mono">Hardware StrongBox</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                    Admin
                  </span>
                </div>

                {groupMemberList.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/60 border border-neutral-800/80"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={m.avatar}
                        alt={m.name}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-xs font-semibold text-white">{m.name}</p>
                        <p className="text-[10px] text-neutral-400 font-mono">{m.handle}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                      Member
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* End-to-End Cryptography & Safety Number */}
          <div className="bg-neutral-800/60 border border-neutral-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Verified Safety Number
                </span>
              </div>
              <button
                id="btn-toggle-verify-contact"
                onClick={() => onToggleVerifyContact?.(contact.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  contact.isVerified
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700'
                }`}
              >
                {contact.isVerified ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Verify Identity</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Compare this 60-digit number with {contact.name}'s device or scan their QR code to guarantee zero eavesdropping or Man-in-the-Middle interference.
            </p>

            {/* Formatted Safety Number */}
            <div className="bg-neutral-900/90 border border-neutral-800 p-3 rounded-xl font-mono text-xs text-neutral-200 tracking-wider flex items-center justify-between">
              <span className="select-all">{contact.safetyNumber}</span>
              <button
                id="btn-copy-safety-number"
                onClick={handleCopySafetyNumber}
                className="ml-2 p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                title="Copy Safety Number"
              >
                {copiedSafety ? (
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* QR Code toggle */}
            <button
              id="btn-toggle-qr-code"
              onClick={() => setShowQr(!showQr)}
              className="w-full py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center gap-2 text-xs font-medium text-neutral-300 hover:text-white transition-colors"
            >
              <QrCode className="w-4 h-4 text-teal-400" />
              <span>{showQr ? 'Hide Identity QR Code' : 'Display Identity QR Code'}</span>
            </button>

            {showQr && (
              <div className="p-4 bg-white rounded-2xl flex flex-col items-center justify-center space-y-2 animate-in zoom-in-95">
                {/* Visual SVG QR representation */}
                <div className="w-40 h-40 bg-neutral-900 p-2 rounded-xl flex items-center justify-center">
                  <div className="w-full h-full border-4 border-dashed border-teal-400 flex flex-col items-center justify-center text-center p-2">
                    <QrCode className="w-16 h-16 text-teal-400" />
                    <span className="text-[9px] font-mono text-white mt-1">E2EE-ECDH-TINK</span>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-600 font-mono text-center">
                  Scan to verify with recipient
                </p>
              </div>
            )}

            {/* Public Key Fingerprint */}
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
              <span>Public Key Hash:</span>
              <div className="flex items-center gap-1 font-mono text-neutral-300">
                <span>{contact.publicKeyFingerprint}</span>
                <button
                  onClick={handleCopyPublicKey}
                  className="p-1 hover:text-white"
                  title="Copy Key Fingerprint"
                >
                  {copiedKey ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Conversation Media Stats */}
          <div className="bg-neutral-800/60 border border-neutral-800 p-3.5 rounded-2xl flex items-center justify-between text-xs">
            <span className="text-neutral-400">Stored Encrypted Messages:</span>
            <span className="font-bold text-white">{chatMessages.length} items</span>
          </div>

          {/* Destructive Actions */}
          <div className="space-y-2 pt-2">
            <button
              id="btn-clear-chat-history"
              onClick={() => {
                if (window.confirm(`Permanently shred and delete all messages with ${contact.name}?`)) {
                  onClearChat?.(contact.id);
                  onClose();
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear & Shred Conversation</span>
            </button>

            {isGroup && (
              <button
                id="btn-leave-group"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to leave ${contact.name}?`)) {
                    onLeaveGroup?.(contact.id);
                    onClose();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Group Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
