/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Contact, Message } from '../types';
import { formatSafetyNumber } from './cryptoEngine';

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'contact_elena',
    name: 'Dr. Elena Vance',
    handle: '@elena.crypto',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    role: 'Signal Protocol & Cryptography Lead',
    statusText: 'Verified Key Pair: P-256 ECDH',
    isOnline: true,
    lastSeen: 'Active now',
    isVerified: true,
    safetyNumber: formatSafetyNumber('Elena_Vance_Identity_2026'),
    publicKeyFingerprint: '7F3A-8B92-C04E-1D58',
    deviceInfo: {
      model: 'Pixel 8 Pro (Android 14)',
      androidVersion: 'API 34 (UpsideDownCake)',
      keystoreLevel: 'Hardware TEE / StrongBox',
    },
    unreadCount: 0,
    lastMessage: {
      text: 'Welcome to F& E. Your session is end-to-end encrypted with Signal Protocol and AES-256-GCM.',
      timestamp: Date.now() - 1000 * 60 * 2,
      isSelf: false,
      status: 'read',
    },
  },
  {
    id: 'contact_marcus',
    name: 'Marcus Chen',
    handle: '@marcus.secops',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'Hardware Keystore Architect',
    statusText: 'Android Keystore v2 • StrongBox Active',
    isOnline: true,
    lastSeen: 'Active now',
    isVerified: true,
    safetyNumber: formatSafetyNumber('Marcus_Chen_Identity_2026'),
    publicKeyFingerprint: '94B2-1E0F-55D3-A721',
    deviceInfo: {
      model: 'Samsung Galaxy S24 Ultra',
      androidVersion: 'API 34',
      keystoreLevel: 'Hardware TEE / StrongBox',
    },
    unreadCount: 0,
    lastMessage: {
      text: 'Hardware StrongBox keystore initialized for F& E.',
      timestamp: Date.now() - 1000 * 60 * 15,
      isSelf: false,
      status: 'delivered',
    },
  },
  {
    id: 'contact_sarah',
    name: 'Sarah Miller',
    handle: '@sarah.audit',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    role: 'Lead Penetration Tester',
    statusText: 'TLS 1.3 Pinning Audit Completed',
    isOnline: false,
    lastSeen: '12m ago',
    isVerified: false,
    safetyNumber: formatSafetyNumber('Sarah_Miller_Identity_2026'),
    publicKeyFingerprint: '2C89-6F14-A33B-E019',
    deviceInfo: {
      model: 'Sony Xperia 1 V',
      androidVersion: 'API 33 (Tiramisu)',
      keystoreLevel: 'Hardware TEE / StrongBox',
    },
    unreadCount: 0,
    lastMessage: {
      text: 'Inspected the AES-GCM 128-bit authentication tag. Zero leakage across 100k packets.',
      timestamp: Date.now() - 1000 * 60 * 65,
      isSelf: false,
      status: 'read',
    },
  },
  {
    id: 'contact_david',
    name: 'David Kowalski',
    handle: '@david.network',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'Offline Sync & WorkManager Dev',
    statusText: 'Offline Queueing: Room Sync Worker',
    isOnline: true,
    lastSeen: 'Active now',
    isVerified: false,
    safetyNumber: formatSafetyNumber('David_Kowalski_Identity_2026'),
    publicKeyFingerprint: '6D11-4A78-99CC-0B32',
    deviceInfo: {
      model: 'Motorola Edge 50 Ultra',
      androidVersion: 'API 34',
      keystoreLevel: 'Software Fallback',
    },
    unreadCount: 0,
    lastMessage: {
      text: 'F& E offline sync queue is ready for testing.',
      timestamp: Date.now() - 1000 * 60 * 180,
      isSelf: true,
      status: 'read',
    },
  },
  {
    id: 'contact_gemini',
    name: 'Gemini Assistant AI',
    handle: '@gemini.ai',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    role: 'AI Security Inquiries & Smart Assistant',
    statusText: 'Google Gemini 3.8 Flash • Online',
    isOnline: true,
    lastSeen: 'Active now',
    isVerified: true,
    safetyNumber: formatSafetyNumber('Gemini_AI_Assistant_38_Flash'),
    publicKeyFingerprint: 'GEMI-NI38-FLAS-H2026',
    deviceInfo: {
      model: 'Gemini 3.8 Flash Neural Engine',
      androidVersion: 'Google AI Cloud API',
      keystoreLevel: 'Hardware TEE / StrongBox',
    },
    unreadCount: 0,
    lastMessage: {
      text: 'Welcome to F& E! Ask me anything about cryptography, AES-256-GCM, Double Ratchet, or drafting secure messages.',
      timestamp: Date.now() - 1000 * 60 * 1,
      isSelf: false,
      status: 'read',
    },
  },
];

export const INITIAL_MESSAGES: Record<string, Message[]> = {
  contact_elena: [
    {
      id: 'msg_elena_1',
      chatId: 'contact_elena',
      senderId: 'contact_elena',
      senderName: 'Dr. Elena Vance',
      isSelf: false,
      timestamp: Date.now() - 1000 * 60 * 2,
      text: 'Welcome to F& E. Your session is end-to-end encrypted with Signal Protocol and AES-256-GCM.',
      mediaType: 'text',
      status: 'read',
      cipherPayload: {
        ivHex: '4a8b79219e2f41c3058a69d2',
        ciphertextHex: '89f3a19dc94285b03e07f6c38a19283e74b9f2c8194a2b',
        tagHex: '4f28ba9012cd34ef56ab789012cd34ef',
        hmacHex: '78b9104c92e10a23b1284920c8a34d8e',
        keyFingerprint: 'ECDH_P256_SHARED_ELENA',
        algorithm: 'AES-256-GCM',
        envelopeVersion: 'GoogleTink-Keystore-v2',
      },
    },
  ],
  contact_marcus: [],
  contact_sarah: [],
  contact_david: [],
  contact_gemini: [
    {
      id: 'msg_gemini_1',
      chatId: 'contact_gemini',
      senderId: 'contact_gemini',
      senderName: 'Gemini Assistant AI',
      isSelf: false,
      timestamp: Date.now() - 1000 * 60 * 1,
      text: "Welcome to F& E! I am your AI security assistant powered by Gemini 3.8 Flash. Send me any cryptography inquiry, ask how Double Ratchet works, or request drafting a message!",
      mediaType: 'text',
      status: 'read',
      cipherPayload: {
        ivHex: '778899aabbccddeeff001122',
        ciphertextHex: 'deadbeefcafe0123456789abcdef998877',
        tagHex: '112233445566778899aabbccddeeff00',
        hmacHex: 'feedfacecafebeef0123456789abcdef',
        keyFingerprint: 'ECDH_P256_SHARED_GEMINI',
        algorithm: 'AES-256-GCM',
        envelopeVersion: 'GoogleTink-Keystore-v2',
      },
    },
  ],
};

export const getFreshInitialData = () => {
  return {
    contacts: JSON.parse(JSON.stringify(INITIAL_CONTACTS)) as Contact[],
    messages: JSON.parse(JSON.stringify(INITIAL_MESSAGES)) as Record<string, Message[]>,
  };
};
