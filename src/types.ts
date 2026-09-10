/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NetworkType = 'WIFI' | '5G' | '4G' | 'OFFLINE';

export type MessageStatus = 'queued_offline' | 'sending' | 'sent' | 'delivered' | 'read';

export type MediaType = 'text' | 'image' | 'video' | 'location' | 'audio';

export interface LiveLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;       // meters
  heading?: number;
  speed?: number;
  durationMinutes: number; // 15, 60, 480
  startedAt: number;
  expiresAt: number;
  addressLabel?: string;
  isLive: boolean;
}

export interface CipherPayload {
  ivHex: string;          // 96-bit (12 bytes) IV
  ciphertextHex: string;  // AES-256-GCM ciphertext
  tagHex: string;         // 128-bit (16 bytes) authentication tag
  hmacHex: string;        // SHA-256 HMAC integrity
  keyFingerprint: string; // ECDH shared key fingerprint
  algorithm: string;      // "AES-256-GCM"
  envelopeVersion: string;// "Tink-v2.1"
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  isSelf: boolean;
  timestamp: number;
  text: string;
  mediaType: MediaType;
  mediaUrl?: string;
  mediaCaption?: string;
  locationData?: LiveLocationData;
  status: MessageStatus;
  cipherPayload: CipherPayload;
  ephemeralSeconds?: number;
  expiresAt?: number;
  isBurned?: boolean;
  isShredding?: boolean; // When timer hit zero, trigger 1.2s burning/shredding animation before permanent deletion
  isStarred?: boolean; // Starred message bookmark
  // View Once Media
  isViewOnce?: boolean;
  viewOnceOpened?: boolean;
  viewOnceOpenedAt?: number;
  // Audio Voice Notes
  audioDuration?: number; // duration in seconds
  // Reactions (emoji -> array of user identifiers, e.g. 'self' or peer name)
  reactions?: Record<string, string[]>;
  // Scheduling
  scheduledFor?: number;
  isScheduled?: boolean;
}

export interface ScheduledMessage {
  id: string;
  chatId: string;
  text: string;
  mediaType?: MediaType;
  mediaUrl?: string;
  caption?: string;
  mediaCaption?: string;
  ephemeralSeconds?: number;
  isViewOnce?: boolean;
  audioDuration?: number;
  scheduledFor: number;
  createdAt: number;
}

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connecting' | 'connected' | 'ended';
export type CallType = 'voice' | 'video';

export interface CallRecord {
  id: string;
  contactId: string;
  contactName: string;
  contactAvatar: string;
  type: CallType;
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: number;
  durationSeconds: number;
  srtpCipher: string;
}

export interface PermissionStatusMap {
  camera: 'granted' | 'prompt' | 'denied';
  microphone: 'granted' | 'prompt' | 'denied';
  location: 'granted' | 'prompt' | 'denied';
  media: 'granted' | 'prompt' | 'denied';
  contacts: 'granted' | 'prompt' | 'denied';
}

export type SettingsSection = 'overview' | 'permissions' | 'disguise' | 'download' | 'keystore' | 'audit' | 'network';

export interface CallEncryptionInfo {
  srtpCipher: string;        // 'AEAD_AES_256_GCM'
  dtlsFingerprint: string;   // SHA-256 cert fingerprint
  sasCodeWords: string;      // Short Authentication String (e.g. "atlas - cobalt - apex")
  sasHex: string;            // 4-byte hex digest
  audioCodec: string;        // 'Opus 48kHz / 32 kbps'
  videoCodec: string;        // 'VP9 1080p 30fps'
  latencyMs: number;         // RTT in ms
  packetLossPercent: number; // e.g. 0.0%
  isVerifiedSAS: boolean;    // Peer verified out-of-band SAS words
}

export interface SignalingEvent {
  id: string;
  timestamp: number;
  type: 'SDP_OFFER' | 'SDP_ANSWER' | 'ICE_CANDIDATE' | 'DTLS_HANDSHAKE' | 'SRTP_SETUP' | 'MEDIA_FLOW' | 'CALL_TERMINATED';
  direction: 'outgoing' | 'incoming' | 'system';
  summary: string;
}

export interface ActiveCallSession {
  callId: string;
  contact: Contact;
  type: CallType;
  status: CallStatus;
  startedAt?: number;
  durationSeconds: number;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  facingMode: 'user' | 'environment';
  encryptionInfo: CallEncryptionInfo;
  signalingLogs: SignalingEvent[];
}

export interface Contact {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  role: string;
  statusText: string;
  isOnline: boolean;
  lastSeen: string;
  isVerified: boolean;
  safetyNumber: string;
  publicKeyFingerprint: string;
  deviceInfo: {
    model: string;
    androidVersion: string;
    keystoreLevel: 'Hardware TEE / StrongBox' | 'Software Fallback';
  };
  unreadCount: number;
  lastMessage?: {
    text: string;
    timestamp: number;
    isSelf: boolean;
    status: MessageStatus;
  };
  // Group chat enhancements
  isGroup?: boolean;
  groupMembers?: string[]; // Array of contact IDs in the group
  groupDescription?: string;
  groupAdminId?: string;
  email?: string;
  phone?: string;
  bio?: string;
  // Archiving & Wallpaper
  isArchived?: boolean;
  wallpaper?: string;
  wallpaperOpacity?: number;
  // App installation requirement
  hasCipherDroid?: boolean; // If false, the contact does not have CipherDroid installed on their device
  // Chat Lock & Draft
  isLocked?: boolean;       // If true, requires PIN or Biometric auth to open chat
  draftText?: string;      // Auto-saved text input draft
}

export interface PhoneContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  hasCipherDroid: boolean;
  cipherDroidHandle?: string;
  publicKeyFingerprint?: string;
  keystoreLevel?: 'Hardware TEE / StrongBox' | 'Software Fallback';
}

export interface WallpaperOption {
  id: string;
  name: string;
  type: 'color' | 'gradient' | 'pattern' | 'custom';
  value: string;
  preview: string;
}

export type AppFont = 'sans' | 'jakarta' | 'mono' | 'serif' | 'rounded' | 'cyber';
export type AppTheme = 'dark' | 'light';

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  webViewLink?: string;
}

export interface GoogleAccountProfile {
  email: string;
  displayName: string;
  photoURL?: string;
  uid: string;
}

export interface ApiPacketLog {
  id: string;
  timestamp: number;
  protocol: 'REST' | 'WSS';
  methodOrEvent: string;
  endpoint: string;
  status: number | 'OK' | 'QUEUED' | 'SHREDDED' | 'FAILED';
  latencyMs: number;
  payloadSize: string;
  summary: string;
  metadataMinimized: boolean;
}

export interface CryptoTestResult {
  id: string;
  name: string;
  category: 'Unit' | 'Integration' | 'Security' | 'Performance';
  status: 'idle' | 'running' | 'passed' | 'failed';
  latencyMs?: number;
  details?: string;
}

export interface GeminiChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isError?: boolean;
  modelName?: string;
  isHighDemandFallback?: boolean;
}

export type WsEventType =
  | 'connection:ack'
  | 'client:init'
  | 'chat:open'
  | 'message:send'
  | 'message:delivered'
  | 'message:read'
  | 'message:received'
  | 'chat:typing';

export interface WsMessageReadPayload {
  type: 'message:read';
  chatId: string;
  messageId?: string;
  readerId: string;
  readerName?: string;
  readAt: number;
}

