/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AndroidFrame } from './components/AndroidFrame';
import { ChatList } from './components/ChatList';
import { ChatRoom } from './components/ChatRoom';
import { BiometricPromptModal } from './components/BiometricPromptModal';
import { CryptoInspectorModal } from './components/CryptoInspectorModal';
import { SafetyNumberModal } from './components/SafetyNumberModal';
import { ApiNetworkDrawer } from './components/ApiNetworkDrawer';
import { SecurityAuditModal } from './components/SecurityAuditModal';
import { MediaUploadModal } from './components/MediaUploadModal';
import { CallScreenModal } from './components/CallScreenModal';
import { IncomingCallBanner } from './components/IncomingCallBanner';
import { MiniCallOverlay } from './components/MiniCallOverlay';
import { StealthDisguiseView } from './components/StealthDisguiseView';
import { SettingsModal } from './components/SettingsModal';
import { AndroidPermissionModal, PermissionPromptType } from './components/AndroidPermissionModal';
import { InstallModal } from './components/InstallModal';
import { ContactDetailsModal } from './components/ContactDetailsModal';
import { CreateGroupModal } from './components/CreateGroupModal';
import { QRContactScanModal } from './components/QRContactScanModal';
import { ChatWallpaperModal } from './components/ChatWallpaperModal';
import { StarredMessagesModal } from './components/StarredMessagesModal';
import { PhoneContactsModal } from './components/PhoneContactsModal';
import { ChatLockModal } from './components/ChatLockModal';
import { Contact, Message, MediaType, NetworkType, ActiveCallSession, CallType, CallRecord, LiveLocationData, GeminiChatMessage, AppFont, AppTheme, PermissionStatusMap, ScheduledMessage } from './types';
import { INITIAL_CONTACTS, INITIAL_MESSAGES, getFreshInitialData } from './services/mockStorage';
import { encryptPayload, initializeCryptoIdentity } from './services/cryptoEngine';
import { networkService } from './services/networkManager';
import { callManager } from './services/callManager';
import { permissionManager } from './services/permissionManager';
import { sendGeminiChat } from './services/geminiClient';
import { websocketService } from './services/websocketService';
import { ShieldCheck, MessageSquare } from 'lucide-react';

const INITIAL_CALL_HISTORY: CallRecord[] = [
  {
    id: 'call_1',
    contactId: 'contact_elena',
    contactName: 'Elena Rostova',
    contactAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    type: 'video',
    direction: 'incoming',
    timestamp: Date.now() - 1000 * 60 * 42,
    durationSeconds: 318,
    srtpCipher: 'DTLS-SRTP (AES-256-GCM)',
  },
  {
    id: 'call_2',
    contactId: 'contact_marcus',
    contactName: 'Marcus Vance',
    contactAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    type: 'voice',
    direction: 'outgoing',
    timestamp: Date.now() - 1000 * 60 * 60 * 3,
    durationSeconds: 145,
    srtpCipher: 'DTLS-SRTP (AES-256-GCM)',
  },
  {
    id: 'call_3',
    contactId: 'contact_sarah',
    contactName: 'Dr. Sarah Chen',
    contactAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    type: 'video',
    direction: 'missed',
    timestamp: Date.now() - 1000 * 60 * 60 * 18,
    durationSeconds: 0,
    srtpCipher: 'DTLS-SRTP (AES-256-GCM)',
  },
  {
    id: 'call_4',
    contactId: 'contact_alex',
    contactName: 'Alex Mercer',
    contactAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    type: 'voice',
    direction: 'outgoing',
    timestamp: Date.now() - 1000 * 60 * 60 * 36,
    durationSeconds: 520,
    srtpCipher: 'DTLS-SRTP (AES-256-GCM)',
  },
];

export default function App() {
  // Wipe legacy data once so app looks brand new as requested
  if (typeof window !== 'undefined' && localStorage.getItem('fe_app_clean_v5') !== 'true') {
    try {
      localStorage.clear();
      localStorage.setItem('fe_app_clean_v5', 'true');
      localStorage.setItem('fe_read_receipts', 'true');
    } catch (e) {
      console.error('Failed to initialize fresh app data', e);
    }
  }

  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem('fe_contacts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved contacts', e);
    }
    return INITIAL_CONTACTS;
  });

  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    try {
      const saved = localStorage.getItem('fe_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // Guarantee contact_gemini has initial greeting if missing
          if (!parsed.contact_gemini || parsed.contact_gemini.length === 0) {
            parsed.contact_gemini = INITIAL_MESSAGES.contact_gemini;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load saved messages', e);
    }
    return INITIAL_MESSAGES;
  });

  // Read Receipts preference state (persisted & synced with websocketService)
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState<boolean>(() => {
    return websocketService.getReadReceiptsEnabled();
  });

  const handleToggleReadReceipts = useCallback(() => {
    setReadReceiptsEnabled((prev) => {
      const next = !prev;
      websocketService.setReadReceiptsEnabled(next);
      return next;
    });
  }, []);

  const [activeContactId, setActiveContactId] = useState<string | null>('contact_elena');
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>('5G');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isTabletView, setIsTabletView] = useState<boolean>(false);

  // Stealth Mode (Hide App / Calculator Disguise)
  const [isStealthMode, setIsStealthMode] = useState<boolean>(false);

  // Settings & Permissions Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isContactDetailsOpen, setIsContactDetailsOpen] = useState<boolean>(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState<boolean>(false);

  // New Feature Modals: QR Scan, Wallpaper, Starred, Phone Contacts
  const [isQRScannerOpen, setIsQRScannerOpen] = useState<boolean>(false);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState<boolean>(false);
  const [isStarredModalOpen, setIsStarredModalOpen] = useState<boolean>(false);
  const [isPhoneContactsOpen, setIsPhoneContactsOpen] = useState<boolean>(false);

  // Chat Lock & Unlocked Chats State
  const [unlockedChatIds, setUnlockedChatIds] = useState<Set<string>>(new Set());
  const [lockingContact, setLockingContact] = useState<{
    contact: Contact;
    mode: 'lock' | 'unlock';
    onSuccess?: () => void;
  } | null>(null);

  // Scheduled Messages State (with persistence)
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>(() => {
    try {
      const saved = localStorage.getItem('fe_scheduled_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('fe_scheduled_messages', JSON.stringify(scheduledMessages));
    } catch (e) {
      console.error('Failed to save scheduled messages', e);
    }
  }, [scheduledMessages]);

  // Full reset handler to clear all storage and restore brand new pristine state
  const handleResetAppData = useCallback(() => {
    try {
      localStorage.clear();
      localStorage.setItem('fe_app_clean_v5', 'true');
      localStorage.setItem('fe_read_receipts', 'true');
    } catch (e) {
      console.error('Failed to clear app data', e);
    }
    const fresh = getFreshInitialData();
    setContacts(fresh.contacts);
    setMessages(fresh.messages);
    setCallHistory(INITIAL_CALL_HISTORY);
    setScheduledMessages([]);
    setUnlockedChatIds(new Set());
    setActiveContactId('contact_elena');
    setReadReceiptsEnabled(true);
    websocketService.setReadReceiptsEnabled(true);
  }, []);

  // Android Permissions State Tracking
  const [permissions, setPermissions] = useState<PermissionStatusMap>(() => permissionManager.getStatus());

  useEffect(() => {
    return permissionManager.subscribe(setPermissions);
  }, []);

  // Star / Unstar Message Handler
  const handleToggleStarMessage = useCallback((messageId: string, specificChatId?: string) => {
    setMessages((prev) => {
      const updated = { ...prev };
      const chatIdsToCheck = specificChatId ? [specificChatId] : Object.keys(updated);

      for (const chatId of chatIdsToCheck) {
        const list = updated[chatId];
        if (!list) continue;
        const idx = list.findIndex((m) => m.id === messageId);
        if (idx !== -1) {
          const nextList = [...list];
          nextList[idx] = {
            ...nextList[idx],
            isStarred: !nextList[idx].isStarred,
          };
          updated[chatId] = nextList;
          break;
        }
      }
      return updated;
    });
  }, []);

  // Wallpaper Setting Handler
  const handleSaveWallpaper = useCallback((wallpaperValue: string, opacity: number, applyToAll: boolean) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (applyToAll || c.id === activeContactId) {
          return {
            ...c,
            wallpaper: wallpaperValue,
            wallpaperOpacity: opacity,
          };
        }
        return c;
      })
    );
    setIsWallpaperModalOpen(false);
  }, [activeContactId]);

  // Archive / Unarchive Chat Handler
  const handleToggleArchiveContact = useCallback((contactId: string) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId ? { ...c, isArchived: !c.isArchived } : c
      )
    );
  }, []);

  // Add Verified Contact from QR Code
  const handleAddScannedContact = useCallback((scannedContact: Contact) => {
    setContacts((prev) => {
      const exists = prev.some((c) => c.id === scannedContact.id || c.handle === scannedContact.handle);
      if (exists) {
        return prev.map((c) =>
          c.id === scannedContact.id || c.handle === scannedContact.handle
            ? { ...c, ...scannedContact, isVerified: true, hasCipherDroid: true }
            : c
        );
      }
      return [scannedContact, ...prev];
    });
    setActiveContactId(scannedContact.id);
    setIsQRScannerOpen(false);
  }, []);

  // Phone Contact Selection Handler
  const handleSelectPhoneContact = useCallback((phoneContact: Contact) => {
    setContacts((prev) => {
      const exists = prev.some((c) => c.id === phoneContact.id || c.handle === phoneContact.handle);
      if (exists) {
        return prev.map((c) =>
          c.id === phoneContact.id || c.handle === phoneContact.handle
            ? { ...c, ...phoneContact }
            : c
        );
      }
      return [phoneContact, ...prev];
    });
    setActiveContactId(phoneContact.id);
    setIsPhoneContactsOpen(false);
  }, []);

  // Custom App Fonts & Theme
  const [currentFont, setCurrentFont] = useState<AppFont>(() => {
    return (localStorage.getItem('fe_font') as AppFont) || 'jakarta';
  });

  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('fe_theme') as AppTheme) || 'dark';
  });

  const handleFontChange = (newFont: AppFont) => {
    setCurrentFont(newFont);
    localStorage.setItem('fe_font', newFont);
  };

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next: AppTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('fe_theme', next);
      return next;
    });
  };

  // Group creation handler
  const handleCreateGroup = (newGroup: Contact) => {
    setContacts((prev) => [newGroup, ...prev]);
    setMessages((prev) => ({
      ...prev,
      [newGroup.id]: [
        {
          id: `msg_grp_init_${Date.now()}`,
          chatId: newGroup.id,
          senderId: 'system',
          senderName: 'CipherDroid Security',
          text: `Encrypted group "${newGroup.name}" created with ${newGroup.groupMembers?.length || 0} participants. End-to-end multi-party encryption initialized.`,
          timestamp: Date.now(),
          isSelf: false,
          status: 'read',
          isEncrypted: true,
          cryptoMetadata: {
            cipher: 'AES-256-GCM',
            iv: '0x3F2A10842B10B45C',
            tag: '0x99B8E1D94C38148A',
            safetyNumber: newGroup.safetyNumber,
            hardwareBacked: true,
            ephemeralKeyExchange: 'Double Ratchet Group Protocol',
          },
        },
      ],
    }));
    setActiveContactId(newGroup.id);
  };

  // Contact / Group deletion handler
  const handleDeleteContact = (contactId: string) => {
    setContacts((prev) => (prev || []).filter((c) => c.id !== contactId));
    if (activeContactId === contactId) {
      setActiveContactId(null);
    }
  };

  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [permissionPrompt, setPermissionPrompt] = useState<{
    isOpen: boolean;
    type: PermissionPromptType;
    onGranted?: () => void;
  }>({
    isOpen: false,
    type: 'all',
  });

  // Call history records for Calls tab
  const [callHistory, setCallHistory] = useState<CallRecord[]>(() => {
    try {
      const saved = localStorage.getItem('fe_call_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load call history', e);
    }
    return INITIAL_CALL_HISTORY;
  });

  // Clear chat history for an individual contact
  const handleClearChat = useCallback((contactId: string | null) => {
    if (!contactId) return;
    setMessages((prev) => ({
      ...prev,
      [contactId]: [],
    }));
  }, []);

  // Persist contacts, messages, callHistory across browser reloads
  useEffect(() => {
    try {
      localStorage.setItem('fe_contacts', JSON.stringify(contacts));
    } catch (e) {
      console.error('Failed to persist contacts', e);
    }
  }, [contacts]);

  useEffect(() => {
    try {
      localStorage.setItem('fe_messages', JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to persist messages', e);
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem('fe_call_history', JSON.stringify(callHistory));
    } catch (e) {
      console.error('Failed to persist call history', e);
    }
  }, [callHistory]);

  // Modals
  const [inspectingMessage, setInspectingMessage] = useState<Message | null>(null);
  const [isSafetyNumberOpen, setIsSafetyNumberOpen] = useState<boolean>(false);
  const [isMediaUploadOpen, setIsMediaUploadOpen] = useState<boolean>(false);
  const [isApiDrawerOpen, setIsApiDrawerOpen] = useState<boolean>(false);
  const [isSecurityAuditOpen, setIsSecurityAuditOpen] = useState<boolean>(false);

  // Active Calling Session & Modal States
  const [callSession, setCallSession] = useState<ActiveCallSession | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState<boolean>(false);

  // Target message ID for search navigation
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);

  // Outbox offline queue count
  const [queuedCount, setQueuedCount] = useState<number>(0);

  // Select contact handler: updates active contact, target message ID, resets unread count, and notifies WebSocket peers
  const handleSelectContact = useCallback((contactId: string, messageId?: string) => {
    const targetContact = contacts.find((c) => c.id === contactId);
    if (targetContact?.isLocked && !unlockedChatIds.has(contactId)) {
      setLockingContact({
        contact: targetContact,
        mode: 'unlock',
        onSuccess: () => {
          setUnlockedChatIds((prev) => new Set([...prev, contactId]));
          setActiveContactId(contactId);
          setTargetMessageId(messageId || null);
          setContacts((prev) =>
            prev.map((c) => (c.id === contactId ? { ...c, unreadCount: 0 } : c))
          );
          websocketService.sendChatOpen(contactId, 'self', 'You');
        },
      });
      return;
    }

    setActiveContactId(contactId);
    setTargetMessageId(messageId || null);

    // Clear unread count for this contact
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, unreadCount: 0 } : c))
    );

    // Notify WebSocket server and peers that chat was opened
    websocketService.sendChatOpen(contactId, 'self', 'You');
  }, [contacts, unlockedChatIds]);

  // Lock / Unlock a contact chat
  const handleToggleLockContact = useCallback((contactId: string) => {
    const targetContact = contacts.find((c) => c.id === contactId);
    if (!targetContact) return;

    if (targetContact.isLocked) {
      // Unlocking/removing the lock
      setLockingContact({
        contact: targetContact,
        mode: 'unlock',
        onSuccess: () => {
          setContacts((prev) =>
            prev.map((c) => (c.id === contactId ? { ...c, isLocked: false, pin: undefined } : c))
          );
          setUnlockedChatIds((prev) => {
            const next = new Set(prev);
            next.delete(contactId);
            return next;
          });
        },
      });
    } else {
      // Setting a lock
      setLockingContact({
        contact: targetContact,
        mode: 'lock',
      });
    }
  }, [contacts]);

  const handleSetLockPin = useCallback((contactId: string, pin: string) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, isLocked: true, pin } : c))
    );
    setUnlockedChatIds((prev) => new Set([...prev, contactId]));
    setLockingContact(null);
  }, []);

  // Draft auto-saving handler with duplicate-prevention
  const handleSaveDraft = useCallback((draft: string, targetContactId?: string) => {
    const targetId = targetContactId || activeContactId;
    if (!targetId) return;
    setContacts((prev) => {
      const existing = prev.find((c) => c.id === targetId);
      if (existing && (existing.draftText || '') === (draft || '')) {
        return prev;
      }
      return prev.map((c) => (c.id === targetId ? { ...c, draftText: draft } : c));
    });
  }, [activeContactId]);

  // Message Reaction toggle handler
  const handleToggleReaction = useCallback((messageId: string, emoji: string) => {
    setMessages((prev) => {
      const updated = { ...prev };
      let changed = false;
      Object.keys(updated).forEach((chatId) => {
        updated[chatId] = updated[chatId].map((msg) => {
          if (msg.id === messageId) {
            changed = true;
            const reactions = { ...(msg.reactions || {}) };
            const currentUsers = reactions[emoji] || [];
            const userIndex = currentUsers.indexOf('self');
            if (userIndex > -1) {
              const nextUsers = currentUsers.filter((u) => u !== 'self');
              if (nextUsers.length === 0) {
                delete reactions[emoji];
              } else {
                reactions[emoji] = nextUsers;
              }
            } else {
              reactions[emoji] = [...currentUsers, 'self'];
            }
            return {
              ...msg,
              reactions,
            };
          }
          return msg;
        });
      });
      return changed ? updated : prev;
    });
  }, []);

  // View Once opened handler
  const handleOpenViewOnce = useCallback((msg: Message) => {
    setMessages((prev) => {
      const updated = { ...prev };
      let changed = false;
      Object.keys(updated).forEach((chatId) => {
        updated[chatId] = updated[chatId].map((m) => {
          if (m.id === msg.id && !m.viewOnceOpened) {
            changed = true;
            return {
              ...m,
              viewOnceOpened: true,
              mediaUrl: undefined, // Zeroized immediately from memory and DOM
              text: m.text ? `${m.text} [View-Once Destroyed]` : '[View-Once Destroyed]',
            };
          }
          return m;
        });
      });
      return changed ? updated : prev;
    });
  }, []);

  // Schedule Message Handler
  const handleScheduleMessage = useCallback((
    text: string,
    scheduledTimestamp: number,
    mediaType?: MediaType,
    mediaUrl?: string,
    caption?: string,
    ephemeralSeconds?: number
  ) => {
    if (!activeContactId) return;
    const newScheduled: ScheduledMessage = {
      id: 'sched_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      chatId: activeContactId,
      text,
      scheduledFor: scheduledTimestamp,
      createdAt: Date.now(),
      mediaType: mediaType || 'text',
      mediaUrl,
      mediaCaption: caption,
      ephemeralSeconds,
    };
    setScheduledMessages((prev) => [...prev, newScheduled]);
  }, [activeContactId]);

  const handleCancelScheduledMessage = useCallback((scheduledId: string) => {
    setScheduledMessages((prev) => prev.filter((s) => s.id !== scheduledId));
  }, []);

  // Subscribe to WebSocket read receipts and delivery confirmations
  useEffect(() => {
    const unsubRead = websocketService.onMessageRead((payload) => {
      const { chatId, messageId, readerId, readAt } = payload;

      // Update message status in state
      setMessages((prev) => {
        if (!prev[chatId]) return prev;
        const updated = prev[chatId].map((m) => {
          if (messageId) {
            if (m.id === messageId) return { ...m, status: 'read' as const };
          } else if (m.isSelf && m.status !== 'read') {
            return { ...m, status: 'read' as const };
          }
          return m;
        });
        return { ...prev, [chatId]: updated };
      });

      // Update contact's last message status in contacts list
      setContacts((prev) =>
        prev.map((c) => {
          if (c.id === chatId && c.lastMessage && c.lastMessage.isSelf) {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                status: 'read' as const,
              },
            };
          }
          return c;
        })
      );

      // Record in Network Logger Drawer
      networkService.addLog({
        protocol: 'WSS',
        methodOrEvent: 'RECEIPT: message:read',
        endpoint: 'wss://api.cipherdroid.internal/ws/receipts',
        status: 'OK',
        latencyMs: 14,
        payloadSize: '128 B',
        summary: `Recipient confirmed read status for chat ${chatId} at ${new Date(readAt).toLocaleTimeString()}.`,
        metadataMinimized: true,
      });
    });

    const unsubDelivered = websocketService.onMessageDelivered((payload) => {
      const { chatId, messageId } = payload;
      setMessages((prev) => {
        if (!prev[chatId]) return prev;
        return {
          ...prev,
          [chatId]: prev[chatId].map((m) =>
            m.id === messageId && (m.status === 'sending' || m.status === 'sent')
              ? { ...m, status: 'delivered' as const }
              : m
          ),
        };
      });
    });

    return () => {
      unsubRead();
      unsubDelivered();
    };
  }, []);

  // Initialize cryptographic hardware keystore identity & subscribe to callManager on mount
  useEffect(() => {
    initializeCryptoIdentity().catch(console.error);

    const unsubscribeCall = callManager.subscribe((session) => {
      setCallSession(session);
      // Auto-open call modal when connected or dialing
      if (session && session.status !== 'incoming') {
        setIsCallModalOpen(true);
      } else if (!session) {
        setIsCallModalOpen(false);
      }
    });

    return () => {
      unsubscribeCall();
    };
  }, []);

  // Update outbox queue count
  const refreshQueueCount = useCallback(() => {
    setQueuedCount(networkService.getQueuedMessages().length);
  }, []);

  // Handle network type changes (WiFi, 5G, 4G, Offline)
  const handleNetworkChange = (newType: NetworkType) => {
    const wasOffline = currentNetwork === 'OFFLINE';
    setCurrentNetwork(newType);
    networkService.setNetworkType(newType);

    // If coming back online from offline, automatically flush queued outbox messages
    if (wasOffline && newType !== 'OFFLINE') {
      handleFlushQueue();
    }
  };

  // Flush offline queued messages via WorkManager sync
  const handleFlushQueue = () => {
    const queued = networkService.clearQueuedMessages();
    if (queued.length === 0) return;

    // Update queued messages to 'sent' and 'delivered'
    setMessages((prev) => {
      const updated = { ...prev };
      queued.forEach((qMsg) => {
        if (updated[qMsg.chatId]) {
          updated[qMsg.chatId] = updated[qMsg.chatId].map((m) =>
            m.id === qMsg.id ? { ...m, status: 'delivered' as const } : m
          );
        }
      });
      return updated;
    });

    networkService.addLog({
      protocol: 'WSS',
      methodOrEvent: 'SYNC: WorkManagerOutboxFlush',
      endpoint: 'wss://api.cipherdroid.internal/ws/messages',
      status: 'OK',
      latencyMs: 76,
      payloadSize: `${queued.length * 320} B`,
      summary: `Room DB WorkManager flushed ${queued.length} offline queued message(s) to recipient.`,
      metadataMinimized: true,
    });

    refreshQueueCount();
  };

  // Send an encrypted message (text, media, or live location)
  const handleSendMessage = async (
    text: string,
    mediaType: MediaType = 'text',
    mediaUrl?: string,
    caption?: string,
    ephemeralSeconds: number = 0,
    locationData?: LiveLocationData,
    isViewOnce?: boolean,
    audioDuration?: number,
    targetChatId?: string
  ) => {
    const chatId = targetChatId || activeContactId;
    if (!chatId) return;

    // Real AES-256-GCM encryption with Web Crypto API!
    const cipherPayload = await encryptPayload(text, chatId);

    const isOffline = currentNetwork === 'OFFLINE';
    const msgId = 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    const newMessage: Message = {
      id: msgId,
      chatId: chatId,
      senderId: 'self',
      senderName: 'Me',
      isSelf: true,
      timestamp: Date.now(),
      text: text,
      mediaType: mediaType,
      mediaUrl: mediaUrl,
      mediaCaption: caption,
      locationData: locationData,
      status: isOffline ? 'queued_offline' : 'sending',
      cipherPayload: cipherPayload,
      ephemeralSeconds: ephemeralSeconds > 0 ? ephemeralSeconds : undefined,
      expiresAt: ephemeralSeconds > 0 ? Date.now() + ephemeralSeconds * 1000 : undefined,
      isBurned: false,
      isViewOnce: isViewOnce,
      viewOnceOpened: false,
      audioDuration: audioDuration,
      reactions: {},
    };

    // Stash in Room DB local messages
    setMessages((prev) => {
      const list = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: [...list, newMessage],
      };
    });

    // Update contact's last message
    setContacts((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              lastMessage: {
                text: mediaType !== 'text' ? `[${mediaType.toUpperCase()}] ${text || caption || ''}` : text,
                timestamp: Date.now(),
                isSelf: true,
                status: isOffline ? 'queued_offline' : 'sent',
              },
            }
          : c
      )
    );

    if (isOffline) {
      networkService.queueMessage(newMessage);
      refreshQueueCount();
    } else {
      // Progressively update status from sending -> sent -> delivered -> read
      networkService.addLog({
        protocol: 'REST',
        methodOrEvent: 'POST /messages/send',
        endpoint: 'https://api.cipherdroid.internal/v1/messages/send',
        status: 200,
        latencyMs: networkService.getLatency(),
        payloadSize: `${Math.round(cipherPayload.ciphertextHex.length / 2)} B`,
        summary: `Encrypted AES-256-GCM payload dispatched to recipient ${chatId}.`,
        metadataMinimized: true,
      });

      // Transmit message over WebSocket to sync with server and recipient clients
      websocketService.sendMessage(newMessage);

      setTimeout(() => {
        setMessages((prev) => {
          if (!prev[chatId]) return prev;
          return {
            ...prev,
            [chatId]: prev[chatId].map((m) =>
              m.id === msgId ? { ...m, status: 'sent' as const } : m
            ),
          };
        });
      }, 200);

      setTimeout(() => {
        setMessages((prev) => {
          if (!prev[chatId]) return prev;
          return {
            ...prev,
            [chatId]: prev[chatId].map((m) =>
              m.id === msgId ? { ...m, status: 'delivered' as const } : m
            ),
          };
        });
      }, 600);

      setTimeout(() => {
        setMessages((prev) => {
          if (!prev[chatId]) return prev;
          return {
            ...prev,
            [chatId]: prev[chatId].map((m) =>
              m.id === msgId ? { ...m, status: 'read' as const } : m
            ),
          };
        });
      }, 1500);

      // If chatting with Gemini Assistant AI contact, query Gemini 3.8 Flash!
      if (chatId === 'contact_gemini') {
        const historyForGemini: GeminiChatMessage[] = (messages['contact_gemini'] || []).map((m) => ({
          id: m.id,
          role: m.isSelf ? 'user' : 'model',
          content: m.text,
          timestamp: m.timestamp,
        }));

        setIsAiTyping(true);
        sendGeminiChat(text, historyForGemini)
          .then(async (result) => {
            const replyText = result.error
              ? `⚠️ ${result.error}`
              : result.reply;

            const replyCipher = await encryptPayload(replyText, 'contact_gemini');
            const replyMsg: Message = {
              id: 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
              chatId: 'contact_gemini',
              senderId: 'contact_gemini',
              senderName: 'Gemini Assistant AI',
              isSelf: false,
              timestamp: Date.now(),
              text: replyText,
              mediaType: 'text',
              status: 'read',
              cipherPayload: replyCipher,
              isBurned: false,
              expiresAt: ephemeralSeconds && ephemeralSeconds > 0 ? Date.now() + ephemeralSeconds * 1000 : undefined,
            };

            setMessages((prev) => ({
              ...prev,
              contact_gemini: [...(prev.contact_gemini || []), replyMsg],
            }));

            setContacts((prev) =>
              prev.map((c) =>
                c.id === 'contact_gemini'
                  ? {
                      ...c,
                      lastMessage: {
                        text: replyText,
                        timestamp: Date.now(),
                        isSelf: false,
                        status: 'read',
                      },
                    }
                  : c
              )
            );
          })
          .catch((err) => {
            console.error('Gemini chat error:', err);
          })
          .finally(() => {
            setIsAiTyping(false);
          });
      }
    }
  };

  const handleSendMessageRef = useRef(handleSendMessage);
  handleSendMessageRef.current = handleSendMessage;

  // Automated background dispatcher for scheduled messages
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setScheduledMessages((prev) => {
        const dueMessages = prev.filter((s) => s.scheduledFor <= now);
        if (dueMessages.length === 0) return prev;

        dueMessages.forEach((sched) => {
          handleSendMessageRef.current(
            sched.text,
            sched.mediaType || 'text',
            sched.mediaUrl,
            sched.mediaCaption,
            sched.ephemeralSeconds || 0,
            undefined,
            false,
            undefined,
            sched.chatId
          );
        });

        return prev.filter((s) => s.scheduledFor > now);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Burn an expired ephemeral message
  const handleBurnMessage = useCallback((msgId: string) => {
    setMessages((prev) => {
      const updated = { ...prev };
      let changed = false;
      Object.keys(updated).forEach((chatId) => {
        updated[chatId] = updated[chatId].map((m) => {
          if (m.id === msgId && !m.isBurned) {
            changed = true;
            return {
              ...m,
              isBurned: true,
              text: '[Self-destructed ephemeral message]',
              mediaUrl: undefined,
            };
          }
          return m;
        });
      });
      return changed ? updated : prev;
    });
  }, []);

  // Permanently delete message from both devices upon timer expiration
  const handlePermanentlyDeleteMessage = useCallback((msgId: string) => {
    setMessages((prev) => {
      const updated = { ...prev };
      let changed = false;

      Object.keys(updated).forEach((chatId) => {
        if (!Array.isArray(updated[chatId])) return;
        const originalLength = updated[chatId].length;
        updated[chatId] = updated[chatId].filter((m) => m && m.id !== msgId);
        if (updated[chatId].length !== originalLength) {
          changed = true;

          // Update contact's last message if needed
          const remaining = updated[chatId];
          const lastMsg = remaining.length > 0 ? remaining[remaining.length - 1] : null;
          setContacts((cPrev) =>
            cPrev.map((c) => {
              if (c.id === chatId) {
                return {
                  ...c,
                  lastMessage: lastMsg
                    ? {
                        text: lastMsg.text,
                        timestamp: lastMsg.timestamp,
                        isSelf: lastMsg.isSelf,
                        status: lastMsg.status,
                      }
                    : {
                        text: 'No messages',
                        timestamp: Date.now(),
                        isSelf: false,
                        status: 'read',
                      },
                };
              }
              return c;
            })
          );
        }
      });

      if (changed) {
        // Log cryptographic shredding in network service
        networkService.addLog({
          protocol: 'WSS',
          methodOrEvent: 'SHRED: AutoPurgeExpired',
          endpoint: 'wss://api.cipherdroid.internal/ws/ephemeral',
          status: 'SHREDDED',
          latencyMs: 12,
          payloadSize: '0 B (Zeroized)',
          summary: `Self-destruct timer expired: Message ${msgId} cryptographic payload & Room DB record permanently deleted from both devices.`,
          metadataMinimized: true,
        });
      }

      return changed ? updated : prev;
    });
  }, []);

  // WebRTC Call Handlers with Android Runtime Permissions
  const handleStartCallWithPermission = (type: CallType, contact?: Contact) => {
    const targetContact = contact || contacts.find((c) => c.id === activeContactId) || contacts[0];
    if (!targetContact) return;

    const currentStatus = permissionManager.getStatus();

    if (type === 'video') {
      if (currentStatus.camera !== 'granted' || currentStatus.microphone !== 'granted') {
        setPermissionPrompt({
          isOpen: true,
          type: currentStatus.camera !== 'granted' ? 'camera' : 'microphone',
          onGranted: () => {
            callManager.startCall(targetContact, type);
            setIsCallModalOpen(true);
          },
        });
        return;
      }
    } else if (type === 'voice') {
      if (currentStatus.microphone !== 'granted') {
        setPermissionPrompt({
          isOpen: true,
          type: 'microphone',
          onGranted: () => {
            callManager.startCall(targetContact, type);
            setIsCallModalOpen(true);
          },
        });
        return;
      }
    }

    callManager.startCall(targetContact, type);
    setIsCallModalOpen(true);
  };

  const handlePermissionModalClose = (granted: boolean) => {
    const callback = permissionPrompt.onGranted;
    setPermissionPrompt({ isOpen: false, type: 'all' });
    if (granted && callback) {
      callback();
    }
  };

  const handleSimulateIncomingCall = (type: CallType) => {
    const contact = contacts.find((c) => c.id === activeContactId) || contacts[0];
    if (contact) {
      callManager.simulateIncomingCall(contact, type);
    }
  };

  // Toggle contact verification
  const handleToggleVerification = (contactId: string, verified: boolean) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, isVerified: verified } : c))
    );
  };

  const activeContact = contacts.find((c) => c.id === activeContactId) || contacts[0];
  const activeChatMessages = activeContactId ? messages[activeContactId] || [] : [];

  return (
    <div
      id="android-encrypted-messenger-root"
      className={`w-full h-full relative font-app-${currentFont} ${
        theme === 'light' ? 'light-mode-app' : ''
      }`}
    >
      <AndroidFrame
        currentNetwork={currentNetwork}
        onLockApp={() => setIsLocked(true)}
        isTabletView={isTabletView}
        onToggleTabletView={() => setIsTabletView(!isTabletView)}
      >
        {/* Stealth Disguise View (Hide App Calculator) */}
        {isStealthMode ? (
          <StealthDisguiseView
            onUnlock={() => setIsStealthMode(false)}
            secretPasskey="1234"
          />
        ) : (
          <>
            {/* Incoming Call Android Notification Banner */}
            <IncomingCallBanner session={callSession} />

            {/* Floating Mini PiP Call Overlay (when call is minimized) */}
            <MiniCallOverlay
              session={callSession}
              onMaximize={() => setIsCallModalOpen(true)}
            />

            {isTabletView ? (
              /* Tablet / Desktop Multi-Pane View (Chat List on Left, Active Chat on Right) */
              <div className="w-full h-full flex divide-x divide-neutral-800">
                <div className="w-80 lg:w-96 h-full shrink-0">
                  <ChatList
                    contacts={contacts}
                    messages={messages}
                    activeContactId={activeContactId}
                    onSelectContact={handleSelectContact}
                    currentNetwork={currentNetwork}
                    onOpenNetworkDrawer={() => setIsApiDrawerOpen(true)}
                    onOpenSecurityAudit={() => setIsSecurityAuditOpen(true)}
                    onLockApp={() => setIsLocked(true)}
                    queuedCount={queuedCount}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onOpenInstallModal={() => setIsInstallModalOpen(true)}
                    onActivateStealthMode={() => setIsStealthMode(true)}
                    onStartCall={(contact, type) => handleStartCallWithPermission(type, contact)}
                    callHistory={callHistory}
                    onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
                    onToggleTheme={handleToggleTheme}
                    theme={theme}
                    onOpenQRScanner={() => setIsQRScannerOpen(true)}
                    onOpenPhoneContacts={() => setIsPhoneContactsOpen(true)}
                    onOpenStarredMessages={() => setIsStarredModalOpen(true)}
                    onToggleArchiveContact={handleToggleArchiveContact}
                  />
                </div>
                <div className="flex-1 h-full">
                  {activeContactId ? (
                    <ChatRoom
                      contact={activeContact}
                      messages={activeChatMessages}
                      targetMessageId={targetMessageId}
                      currentNetwork={currentNetwork}
                      onBack={() => {}}
                      onSendMessage={handleSendMessage}
                      onInspectMessage={(msg) => setInspectingMessage(msg)}
                      onOpenSafetyNumber={() => setIsSafetyNumberOpen(true)}
                      onOpenMediaModal={() => setIsMediaUploadOpen(true)}
                      onBurnMessage={handleBurnMessage}
                      onPermanentlyDeleteMessage={handlePermanentlyDeleteMessage}
                      onStartVoiceCall={() => handleStartCallWithPermission('voice')}
                      onStartVideoCall={() => handleStartCallWithPermission('video')}
                      onSimulateIncomingCall={handleSimulateIncomingCall}
                      isAiTyping={activeContactId === 'contact_gemini' && isAiTyping}
                      onClearChat={() => handleClearChat(activeContactId)}
                      onOpenInstallModal={() => setIsInstallModalOpen(true)}
                      onOpenContactDetails={() => setIsContactDetailsOpen(true)}
                      onToggleStarMessage={handleToggleStarMessage}
                      onOpenWallpaperModal={() => setIsWallpaperModalOpen(true)}
                      onOpenStarredMessages={() => setIsStarredModalOpen(true)}
                      draftText={activeContact?.draftText}
                      onSaveDraft={handleSaveDraft}
                      onToggleReaction={handleToggleReaction}
                      onOpenViewOnce={handleOpenViewOnce}
                      onScheduleMessage={handleScheduleMessage}
                      scheduledMessages={scheduledMessages.filter((s) => s.chatId === activeContactId)}
                      onCancelScheduledMessage={handleCancelScheduledMessage}
                      onToggleLockContact={handleToggleLockContact}
                      readReceiptsEnabled={readReceiptsEnabled}
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-neutral-400">
                      <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-teal-400 mb-3">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-semibold text-neutral-200">
                        No Conversation Selected
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1">
                        Choose a contact from the list to begin end-to-end encrypted messaging.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Mobile Phone View: Either List or Active Room */
              activeContactId ? (
                <ChatRoom
                  contact={activeContact}
                  messages={activeChatMessages}
                  targetMessageId={targetMessageId}
                  currentNetwork={currentNetwork}
                  onBack={() => setActiveContactId(null)}
                  onSendMessage={handleSendMessage}
                  onInspectMessage={(msg) => setInspectingMessage(msg)}
                  onOpenSafetyNumber={() => setIsSafetyNumberOpen(true)}
                  onOpenMediaModal={() => setIsMediaUploadOpen(true)}
                  onBurnMessage={handleBurnMessage}
                  onPermanentlyDeleteMessage={handlePermanentlyDeleteMessage}
                  onStartVoiceCall={() => handleStartCallWithPermission('voice')}
                  onStartVideoCall={() => handleStartCallWithPermission('video')}
                  onSimulateIncomingCall={handleSimulateIncomingCall}
                  isAiTyping={activeContactId === 'contact_gemini' && isAiTyping}
                  onClearChat={() => handleClearChat(activeContactId)}
                  onOpenInstallModal={() => setIsInstallModalOpen(true)}
                  onOpenContactDetails={() => setIsContactDetailsOpen(true)}
                  onToggleStarMessage={handleToggleStarMessage}
                  onOpenWallpaperModal={() => setIsWallpaperModalOpen(true)}
                  onOpenStarredMessages={() => setIsStarredModalOpen(true)}
                  draftText={activeContact?.draftText}
                  onSaveDraft={handleSaveDraft}
                  onToggleReaction={handleToggleReaction}
                  onOpenViewOnce={handleOpenViewOnce}
                  onScheduleMessage={handleScheduleMessage}
                  scheduledMessages={scheduledMessages.filter((s) => s.chatId === activeContactId)}
                  onCancelScheduledMessage={handleCancelScheduledMessage}
                  onToggleLockContact={handleToggleLockContact}
                  readReceiptsEnabled={readReceiptsEnabled}
                />
              ) : (
                <ChatList
                  contacts={contacts}
                  messages={messages}
                  activeContactId={activeContactId}
                  onSelectContact={handleSelectContact}
                  currentNetwork={currentNetwork}
                  onOpenNetworkDrawer={() => setIsApiDrawerOpen(true)}
                  onOpenSecurityAudit={() => setIsSecurityAuditOpen(true)}
                  onLockApp={() => setIsLocked(true)}
                  queuedCount={queuedCount}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onOpenInstallModal={() => setIsInstallModalOpen(true)}
                  onActivateStealthMode={() => setIsStealthMode(true)}
                  onStartCall={(contact, type) => handleStartCallWithPermission(type, contact)}
                  callHistory={callHistory}
                  onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
                  onToggleTheme={handleToggleTheme}
                  theme={theme}
                  onOpenQRScanner={() => setIsQRScannerOpen(true)}
                  onOpenPhoneContacts={() => setIsPhoneContactsOpen(true)}
                  onOpenStarredMessages={() => setIsStarredModalOpen(true)}
                  onToggleArchiveContact={handleToggleArchiveContact}
                />
              )
            )}
          </>
        )}
      </AndroidFrame>

      {/* Progressive Web App Mobile Install Modal */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Full-Screen WebRTC E2EE Voice/Video Call Modal */}
      <CallScreenModal
        isOpen={isCallModalOpen && !!callSession && callSession.status !== 'incoming'}
        onMinimize={() => setIsCallModalOpen(false)}
      />

      {/* BiometricPrompt / 6-digit Passkey Modal */}
      <BiometricPromptModal
        isOpen={isLocked}
        onSuccess={() => setIsLocked(false)}
        allowCancel={false}
      />

      {/* Settings Modal (Houses Keystore, Permissions, PWA Phone Download, Security Audit, Fonts, Themes, Google Drive & Backup) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenSecurityAudit={() => {
          setIsSettingsOpen(false);
          setIsSecurityAuditOpen(true);
        }}
        onOpenNetworkDrawer={() => {
          setIsSettingsOpen(false);
          setIsApiDrawerOpen(true);
        }}
        onActivateStealthMode={() => {
          setIsSettingsOpen(false);
          setIsStealthMode(true);
        }}
        onRequestPermissions={() => {
          setPermissionPrompt({
            isOpen: true,
            type: 'all',
          });
        }}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        currentFont={currentFont}
        onFontChange={handleFontChange}
        contacts={contacts}
        messages={messages}
        readReceiptsEnabled={readReceiptsEnabled}
        onToggleReadReceipts={handleToggleReadReceipts}
        onResetAppData={handleResetAppData}
      />

      {/* Contact & Group Details Modal */}
      {activeContact && (
        <ContactDetailsModal
          isOpen={isContactDetailsOpen}
          onClose={() => setIsContactDetailsOpen(false)}
          contact={activeContact}
          allContacts={contacts}
          messages={messages}
          onOpenSafetyNumber={() => {
            setIsContactDetailsOpen(false);
            setIsSafetyNumberOpen(true);
          }}
          onDeleteContact={(id) => {
            handleDeleteContact(id);
            setIsContactDetailsOpen(false);
          }}
          onClearChat={handleClearChat}
        />
      )}

      {/* Multi-Party Encrypted Group Creation Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        contacts={contacts}
        availableContacts={contacts}
        onCreateGroup={handleCreateGroup}
      />

      {/* Android 14 Runtime Permission Dialog (Camera, Mic, Location) */}
      <AndroidPermissionModal
        isOpen={permissionPrompt.isOpen}
        type={permissionPrompt.type}
        onClose={handlePermissionModalClose}
      />

      {/* AES-256-GCM Crypto Inspector Modal */}
      <CryptoInspectorModal
        isOpen={!!inspectingMessage}
        onClose={() => setInspectingMessage(null)}
        message={inspectingMessage}
      />

      {/* Safety Number Modal */}
      {activeContact && (
        <SafetyNumberModal
          isOpen={isSafetyNumberOpen}
          onClose={() => setIsSafetyNumberOpen(false)}
          contact={activeContact}
          onToggleVerification={handleToggleVerification}
        />
      )}

      {/* Encrypted Media Upload Modal */}
      <MediaUploadModal
        isOpen={isMediaUploadOpen}
        onClose={() => setIsMediaUploadOpen(false)}
        onSendMedia={(params) => {
          handleSendMessage(
            params.caption || `[${params.mediaType.toUpperCase()}] Encrypted media`,
            params.mediaType,
            params.mediaUrl,
            params.caption,
            params.ephemeralSeconds,
            undefined,
            params.isViewOnce
          );
        }}
      />

      {/* Chat Lock / Unlock Authentication Modal */}
      <ChatLockModal
        isOpen={!!lockingContact}
        contact={lockingContact ? lockingContact.contact : null}
        onClose={() => setLockingContact(null)}
        onUnlockSuccess={() => {
          if (lockingContact?.onSuccess) {
            lockingContact.onSuccess();
          } else if (lockingContact?.mode === 'lock') {
            const contactId = lockingContact.contact.id;
            setContacts((prev) =>
              prev.map((c) => (c.id === contactId ? { ...c, isLocked: true } : c))
            );
            setUnlockedChatIds((prev) => new Set([...prev, contactId]));
          }
          setLockingContact(null);
        }}
      />

      {/* Key APIs & Android Network Drawer */}
      <ApiNetworkDrawer
        isOpen={isApiDrawerOpen}
        onClose={() => setIsApiDrawerOpen(false)}
        currentNetwork={currentNetwork}
        onNetworkChange={handleNetworkChange}
        queuedCount={queuedCount}
        onFlushQueue={handleFlushQueue}
      />

      {/* Security Audit & 11-Week Development Roadmap Modal */}
      <SecurityAuditModal
        isOpen={isSecurityAuditOpen}
        onClose={() => setIsSecurityAuditOpen(false)}
      />

      {/* Phone Contacts Synced Modal */}
      <PhoneContactsModal
        isOpen={isPhoneContactsOpen}
        onClose={() => setIsPhoneContactsOpen(false)}
        existingContacts={contacts}
        onSelectContactToChat={handleSelectPhoneContact}
        hasContactsPermission={permissions.contacts === 'granted'}
        onRequestContactsPermission={() => {
          permissionManager.requestContacts();
        }}
      />

      {/* QR Code Contact Scanner & Identity Generator Modal */}
      <QRContactScanModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onAddContact={handleAddScannedContact}
        hasCameraPermission={permissions.camera === 'granted'}
        onRequestCameraPermission={() => {
          permissionManager.requestCamera();
        }}
        hasMediaPermission={permissions.media === 'granted'}
        onRequestMediaPermission={() => {
          permissionManager.requestMedia();
        }}
      />

      {/* Chat Wallpaper Customizer Modal */}
      <ChatWallpaperModal
        isOpen={isWallpaperModalOpen}
        onClose={() => setIsWallpaperModalOpen(false)}
        currentWallpaper={activeContact?.wallpaper || '#0a0a0a'}
        currentOpacity={activeContact?.wallpaperOpacity ?? 85}
        contactName={activeContact?.name}
        onSaveWallpaper={handleSaveWallpaper}
        hasMediaPermission={permissions.media === 'granted'}
        onRequestMediaPermission={() => {
          permissionManager.requestMedia();
        }}
      />

      {/* Starred Messages Viewer Modal */}
      <StarredMessagesModal
        isOpen={isStarredModalOpen}
        onClose={() => setIsStarredModalOpen(false)}
        messages={messages}
        contacts={contacts}
        activeChatId={activeContactId}
        onToggleStarMessage={handleToggleStarMessage}
        onSelectChat={(chatId) => {
          setActiveContactId(chatId);
          setIsStarredModalOpen(false);
        }}
      />
    </div>
  );
}

