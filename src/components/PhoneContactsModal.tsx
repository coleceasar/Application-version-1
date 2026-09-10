/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  Search,
  X,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  Share2,
  Check,
  Smartphone,
  Copy,
  UserPlus,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { Contact, PhoneContact } from '../types';
import { formatSafetyNumber } from '../services/cryptoEngine';

export const SAMPLE_PHONE_CONTACTS: PhoneContact[] = [
  {
    id: 'phone_c1',
    name: 'Dr. Alex Thorne',
    phone: '+1 (555) 389-1024',
    email: 'alex.thorne@mit.edu',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    hasCipherDroid: true,
    cipherDroidHandle: '@alex.thorne',
    publicKeyFingerprint: 'A3F9-82E1-4D09-B720',
    keystoreLevel: 'Hardware TEE / StrongBox',
  },
  {
    id: 'phone_c2',
    name: 'Maya Lin',
    phone: '+1 (555) 742-9931',
    email: 'maya.lin@cybersec.org',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    hasCipherDroid: true,
    cipherDroidHandle: '@maya.lin',
    publicKeyFingerprint: '8E4C-91B2-77F0-192A',
    keystoreLevel: 'Hardware TEE / StrongBox',
  },
  {
    id: 'phone_c3',
    name: 'Robert Taylor',
    phone: '+1 (555) 201-8843',
    email: 'robert.taylor@acme-corp.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    hasCipherDroid: false, // DOES NOT HAVE CIPHERDROID INSTALLED
  },
  {
    id: 'phone_c4',
    name: 'Emily Watson (Dentist)',
    phone: '+1 (555) 492-3310',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    hasCipherDroid: false, // DOES NOT HAVE CIPHERDROID INSTALLED
  },
  {
    id: 'phone_c5',
    name: 'Kenji Sato',
    phone: '+81 90-1234-5678',
    email: 'kenji.s@security.tokyo',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    hasCipherDroid: true,
    cipherDroidHandle: '@kenji.sato',
    publicKeyFingerprint: '3B77-90A1-FE22-68C4',
    keystoreLevel: 'Hardware TEE / StrongBox',
  },
  {
    id: 'phone_c6',
    name: 'Liam Johnson (Courier)',
    phone: '+1 (555) 678-9012',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    hasCipherDroid: false, // DOES NOT HAVE CIPHERDROID INSTALLED
  },
];

interface PhoneContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingContacts: Contact[];
  onSelectContactToChat: (contact: Contact) => void;
  hasContactsPermission: boolean;
  onRequestContactsPermission: () => void;
}

export const PhoneContactsModal: React.FC<PhoneContactsModalProps> = ({
  isOpen,
  onClose,
  existingContacts,
  onSelectContactToChat,
  hasContactsPermission,
  onRequestContactsPermission,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'installed' | 'not_installed'>('all');
  const [incompatibleNoticeContact, setIncompatibleNoticeContact] = useState<PhoneContact | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 600);
  };

  const handleContactAction = (phoneContact: PhoneContact) => {
    if (!phoneContact.hasCipherDroid) {
      // Show security requirement: cannot message contacts who do not have CipherDroid installed
      setIncompatibleNoticeContact(phoneContact);
      return;
    }

    // Check if already in existing chat contacts
    const existing = existingContacts.find(
      (c) => c.phone === phoneContact.phone || c.name.toLowerCase() === phoneContact.name.toLowerCase()
    );

    if (existing) {
      onSelectContactToChat(existing);
      onClose();
      return;
    }

    // Convert PhoneContact to Contact
    const newContact: Contact = {
      id: `contact_phone_${phoneContact.id}`,
      name: phoneContact.name,
      handle: phoneContact.cipherDroidHandle || `@${phoneContact.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      avatar: phoneContact.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      role: 'CipherDroid Peer',
      statusText: 'Verified Android Key Pair',
      isOnline: true,
      lastSeen: 'Active now',
      isVerified: true,
      safetyNumber: formatSafetyNumber(phoneContact.name + '_Identity'),
      publicKeyFingerprint: phoneContact.publicKeyFingerprint || '99AA-BBCC-DDEE-FF00',
      deviceInfo: {
        model: 'Android Verified Peer',
        androidVersion: 'API 34',
        keystoreLevel: 'Hardware TEE / StrongBox',
      },
      unreadCount: 0,
      phone: phoneContact.phone,
      email: phoneContact.email,
      hasCipherDroid: true,
    };

    onSelectContactToChat(newContact);
    onClose();
  };

  const handleCopyInvite = (contactName: string) => {
    const inviteText = `Join me on CipherDroid for end-to-end encrypted messaging with hardware-backed security! Download the APK or open the web app: https://cipherdroid.app/invite?ref=${encodeURIComponent(contactName)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteText);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const filteredContacts = SAMPLE_PHONE_CONTACTS.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterMode === 'installed') return c.hasCipherDroid;
    if (filterMode === 'not_installed') return !c.hasCipherDroid;
    return true;
  });

  const installedCount = SAMPLE_PHONE_CONTACTS.filter((c) => c.hasCipherDroid).length;
  const nonInstalledCount = SAMPLE_PHONE_CONTACTS.filter((c) => !c.hasCipherDroid).length;

  return (
    <div
      id="phone-contacts-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in"
    >
      <div
        id="phone-contacts-card"
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Phone Contacts
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  Android 14
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Only peers with CipherDroid installed can be messaged
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              id="sync-phone-contacts-btn"
              onClick={handleSync}
              title="Refresh phone contacts"
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-teal-400' : ''}`} />
            </button>
            <button
              id="close-phone-contacts-modal"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Permission Gate Banner if not granted */}
        {!hasContactsPermission && (
          <div className="p-4 bg-teal-950/40 border-b border-teal-500/30 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-semibold text-teal-200">
                Contact permission needed
              </p>
              <p className="text-teal-400/80 mt-0.5 leading-relaxed">
                Grant permission so CipherDroid can scan your address book and detect encrypted peers.
              </p>
            </div>
            <button
              id="grant-contacts-permission-btn"
              onClick={onRequestContactsPermission}
              className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs transition-colors shrink-0 shadow-sm"
            >
              Allow Access
            </button>
          </div>
        )}

        {/* Search bar */}
        <div className="p-4 border-b border-neutral-800 space-y-3 bg-neutral-900/60">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-phone-contacts-input"
              type="text"
              placeholder="Search by name, phone or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-950/80 border border-neutral-800 focus:border-teal-500 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 text-xs">
            <button
              id="filter-phone-all"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                filterMode === 'all'
                  ? 'bg-neutral-800 text-white border-neutral-700'
                  : 'text-neutral-400 border-transparent hover:bg-neutral-800/50'
              }`}
            >
              All ({SAMPLE_PHONE_CONTACTS.length})
            </button>
            <button
              id="filter-phone-installed"
              onClick={() => setFilterMode('installed')}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
                filterMode === 'installed'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'text-neutral-400 border-transparent hover:bg-neutral-800/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              CipherDroid ({installedCount})
            </button>
            <button
              id="filter-phone-not-installed"
              onClick={() => setFilterMode('not_installed')}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
                filterMode === 'not_installed'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'text-neutral-400 border-transparent hover:bg-neutral-800/50'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Invite Only ({nonInstalledCount})
            </button>
          </div>
        </div>

        {/* List of Contacts */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 space-y-2">
              <Users className="w-10 h-10 mx-auto stroke-[1.5] text-neutral-600" />
              <p className="text-sm">No phone contacts match your search.</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isInstalled = contact.hasCipherDroid;

              return (
                <div
                  key={contact.id}
                  id={`phone-contact-item-${contact.id}`}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isInstalled
                      ? 'bg-neutral-950/60 border-neutral-800/80 hover:border-teal-500/50 hover:bg-neutral-800/40'
                      : 'bg-neutral-950/30 border-neutral-900 opacity-85 hover:opacity-100 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={contact.avatar}
                        alt={contact.name}
                        className="w-11 h-11 rounded-full object-cover border border-neutral-700"
                      />
                      {isInstalled ? (
                        <div
                          title="CipherDroid peer with Hardware Keystore"
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center border-2 border-neutral-900 shadow-sm"
                        >
                          <ShieldCheck className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      ) : (
                        <div
                          title="App not installed on device"
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-neutral-700 text-neutral-300 flex items-center justify-center border-2 border-neutral-900"
                        >
                          <Lock className="w-3 h-3 stroke-[2]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white truncate">
                          {contact.name}
                        </h4>
                        {isInstalled ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                            CipherDroid Peer
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 border border-neutral-700 shrink-0">
                            Not on CipherDroid
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 truncate mt-0.5 font-mono">
                        {contact.phone}
                      </p>
                      {isInstalled && contact.publicKeyFingerprint && (
                        <p className="text-[10px] text-teal-400/80 font-mono truncate">
                          Key: {contact.publicKeyFingerprint}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isInstalled ? (
                      <button
                        id={`chat-with-phone-contact-${contact.id}`}
                        onClick={() => handleContactAction(contact)}
                        className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat
                      </button>
                    ) : (
                      <button
                        id={`invite-phone-contact-${contact.id}`}
                        onClick={() => handleContactAction(contact)}
                        className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1.5 border border-neutral-700 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5 text-neutral-400" />
                        Invite
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info banner */}
        <div className="p-3.5 bg-neutral-950/90 border-t border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-neutral-400">
            <Lock className="w-3.5 h-3.5 text-teal-400" />
            Strict Peer Isolation Policy Active
          </span>
          <span className="text-[11px] text-neutral-500 font-mono">
            {installedCount} of {SAMPLE_PHONE_CONTACTS.length} with CipherDroid
          </span>
        </div>
      </div>

      {/* Modal / Dialog when trying to message a non-CipherDroid user */}
      {incompatibleNoticeContact && (
        <div
          id="incompatible-peer-dialog"
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-white">
                Cannot Message Contact
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                <span className="font-semibold text-white">{incompatibleNoticeContact.name}</span> does not have CipherDroid installed on their device.
              </p>
              <div className="p-3 bg-neutral-950/80 rounded-2xl border border-neutral-800 text-left text-xs text-neutral-400 space-y-1.5">
                <p className="font-semibold text-neutral-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" /> Cryptographic Requirement:
                </p>
                <p className="text-[11px] leading-normal text-neutral-400">
                  CipherDroid operates exclusively over zero-knowledge end-to-end encrypted tunnels (AES-256-GCM / Hardware TEE). Standard SMS and non-CipherDroid apps cannot decrypt our cryptographic payloads.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                id="copy-cipherdroid-invite-btn"
                onClick={() => handleCopyInvite(incompatibleNoticeContact.name)}
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-black" />
                    Invite Link Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-black" />
                    Share CipherDroid Invite Link
                  </>
                )}
              </button>
              <button
                id="dismiss-incompatible-dialog-btn"
                onClick={() => setIncompatibleNoticeContact(null)}
                className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
