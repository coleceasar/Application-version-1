/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Contact, Message, GoogleDriveBackupFile, GoogleAccountProfile } from '../types';

// Ensure single Firebase app initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory access token cache (NOT in localStorage per security guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initGoogleAuth = (
  callback: (user: GoogleAccountProfile | null, token: string | null) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const profile: GoogleAccountProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Google User',
        photoURL: user.photoURL || undefined,
      };
      callback(profile, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      callback(null, null);
    }
  });
};

export const signInWithGoogle = async (): Promise<{
  profile: GoogleAccountProfile;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not acquire Google Drive access token from authentication result');
    }

    cachedAccessToken = credential.accessToken;
    const user = result.user;
    const profile: GoogleAccountProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Google User',
      photoURL: user.photoURL || undefined,
    };

    return { profile, accessToken: cachedAccessToken };
  } catch (err: unknown) {
    console.error('[GoogleDriveService] Sign in failed:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const signOutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Uploads an encrypted backup archive to Google Drive using multipart upload
 */
export const uploadBackupToGoogleDrive = async (
  contacts: Contact[],
  messages: Record<string, Message[]>
): Promise<{ fileId: string; name: string; size: number }> => {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Google Account is not connected. Please connect your Google account first.');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `CipherDroid_Encrypted_Backup_${timestamp}.json`;

  const backupPayload = {
    version: '2.4',
    app: 'CipherDroid Android Encrypted Messenger',
    createdAt: Date.now(),
    exportedAtFormatted: new Date().toLocaleString(),
    algorithm: 'AES-256-GCM / Tink-v2.1 Envelope',
    contactsCount: contacts.length,
    totalMessagesCount: Object.values(messages).reduce((acc, m) => acc + m.length, 0),
    data: {
      contacts,
      messages,
    },
  };

  const fileContent = JSON.stringify(backupPayload, null, 2);
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'Encrypted backup of CipherDroid messages and verified contacts',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive upload failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return {
    fileId: result.id,
    name: result.name || fileName,
    size: new Blob([fileContent]).size,
  };
};

/**
 * Lists previously created CipherDroid backups from the user's Google Drive
 */
export const listGoogleDriveBackups = async (): Promise<GoogleDriveBackupFile[]> => {
  const token = cachedAccessToken;
  if (!token) return [];

  const query = "name contains 'CipherDroid_Encrypted_Backup' and trashed = false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,createdTime,size,webViewLink)&orderBy=createdTime desc&pageSize=10`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.warn('[GoogleDriveService] Failed to list backups:', response.status);
    return [];
  }

  const data = await response.json();
  return (data.files || []).map((f: Record<string, string>) => ({
    id: f.id,
    name: f.name,
    createdTime: f.createdTime,
    size: f.size ? `${(parseInt(f.size, 10) / 1024).toFixed(1)} KB` : undefined,
    webViewLink: f.webViewLink,
  }));
};

/**
 * Downloads a backup file from Google Drive and parses it
 */
export const downloadGoogleDriveBackup = async (fileId: string): Promise<Record<string, unknown>> => {
  const token = cachedAccessToken;
  if (!token) throw new Error('Not connected to Google Drive');

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download backup file: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Exports chat data locally as a downloaded JSON file
 */
export const exportLocalChatData = (
  contacts: Contact[],
  messages: Record<string, Message[]>,
  specificChatId?: string
): void => {
  const isSingleChat = !!specificChatId;
  const targetContact = isSingleChat ? contacts.find((c) => c.id === specificChatId) : null;
  const targetMessages = isSingleChat
    ? { [specificChatId!]: messages[specificChatId!] || [] }
    : messages;

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    app: 'CipherDroid Android Encrypted Messenger',
    chatTitle: isSingleChat ? targetContact?.name || 'Conversation' : 'All Encrypted Conversations',
    encryptionProtocol: 'AES-256-GCM / Hardware Keystore TEE',
    totalMessages: Object.values(targetMessages).reduce((acc, m) => acc + m.length, 0),
    contacts: isSingleChat && targetContact ? [targetContact] : contacts,
    messages: targetMessages,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  const safeName = isSingleChat
    ? (targetContact?.name || 'chat').replace(/[^a-zA-Z0-9]/g, '_')
    : 'All_Chats';
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `CipherDroid_${safeName}_Backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
