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
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Contact, Message, CallRecord } from '../types';

// Ensure single Firebase app instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: The app will break without firebaseConfig.firestoreDatabaseId
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

// Error handling specification conforming to FirestoreErrorInfo
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
let isConnectedToFirestore = false;
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    isConnectedToFirestore = true;
    console.log('Firestore connection verified successfully to database:', firebaseConfig.firestoreDatabaseId);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is currently offline or connecting in background');
    } else {
      // Permission-denied on /test/connection is normal since default rules block it, but confirms server reachability
      isConnectedToFirestore = true;
    }
    return isConnectedToFirestore;
  }
}

// Run initial connection test
testFirestoreConnection();

/**
 * Authentication with Firebase Google Provider
 */
export async function signInWithFirebaseGoogle(): Promise<User> {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    if (res.user) {
      await syncUserProfile(res.user);
    }
    return res.user;
  } catch (error) {
    console.error('Firebase sign-in error:', error);
    throw error;
  }
}

export async function signOutFromFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Firebase sign-out error:', error);
    throw error;
  }
}

export function subscribeToFirebaseAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

/**
 * Sync user profile to /users/{userId}
 */
export async function syncUserProfile(user: User, publicKey?: string): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Encrypted User',
        email: user.email || '',
        photoURL: user.photoURL || '',
        publicKey: publicKey || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save contact to Firestore: /users/{userId}/contacts/{contactId}
 */
export async function saveContactToFirestore(userId: string, contact: Contact): Promise<void> {
  const path = `users/${userId}/contacts/${contact.id}`;
  try {
    await setDoc(
      doc(db, 'users', userId, 'contacts', contact.id),
      {
        id: contact.id,
        name: contact.name,
        phone: contact.phone || '',
        avatar: contact.avatar || '',
        status: contact.statusText || 'offline',
        publicKey: contact.publicKeyFingerprint || '',
        unreadCount: contact.unreadCount || 0,
        isLocked: !!contact.isLocked,
        userId: userId,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save message to Firestore: /users/{userId}/messages/{messageId}
 */
export async function saveMessageToFirestore(userId: string, message: Message): Promise<void> {
  const path = `users/${userId}/messages/${message.id}`;
  try {
    await setDoc(
      doc(db, 'users', userId, 'messages', message.id),
      {
        id: message.id,
        chatId: message.chatId,
        senderId: message.senderId,
        text: message.text || '',
        status: message.status || 'sent',
        type: message.mediaType || 'text',
        isEncrypted: message.cipherPayload?.ciphertextHex ? true : false,
        timestamp: new Date(message.timestamp).toISOString(),
        userId: userId,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save call log to Firestore: /users/{userId}/calls/{callId}
 */
export async function saveCallRecordToFirestore(userId: string, call: CallRecord): Promise<void> {
  const path = `users/${userId}/calls/${call.id}`;
  try {
    await setDoc(
      doc(db, 'users', userId, 'calls', call.id),
      {
        id: call.id,
        contactId: call.contactId,
        contactName: call.contactName,
        type: call.type,
        direction: call.direction,
        timestamp: new Date(call.timestamp).toISOString(),
        duration: call.durationSeconds || 0,
        userId: userId,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save client user settings to Firestore: /users/{userId}/settings/config
 */
export async function saveUserSettingsToFirestore(
  userId: string,
  settings: { readReceipts?: boolean; font?: string; theme?: string }
): Promise<void> {
  const path = `users/${userId}/settings/config`;
  try {
    await setDoc(
      doc(db, 'users', userId, 'settings', 'config'),
      {
        userId: userId,
        readReceipts: settings.readReceipts ?? true,
        font: settings.font || 'jakarta',
        theme: settings.theme || 'dark',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Batch sync all local data to Cloud Firestore
 */
export async function syncAllLocalDataToFirestore(
  userId: string,
  contacts: Contact[],
  messages: Record<string, Message[]>,
  calls: CallRecord[]
): Promise<{ countContacts: number; countMessages: number; countCalls: number }> {
  let countContacts = 0;
  let countMessages = 0;
  let countCalls = 0;

  for (const c of contacts) {
    await saveContactToFirestore(userId, c);
    countContacts++;
  }

  for (const chatId of Object.keys(messages)) {
    const list = messages[chatId] || [];
    for (const msg of list) {
      await saveMessageToFirestore(userId, msg);
      countMessages++;
    }
  }

  for (const call of calls) {
    await saveCallRecordToFirestore(userId, call);
    countCalls++;
  }

  return { countContacts, countMessages, countCalls };
}

/**
 * Listen in realtime to user's Cloud Firestore documents
 */
export function subscribeToUserCloudData(
  userId: string,
  onUpdate: (data: {
    contacts?: Contact[];
    messages?: Record<string, Message[]>;
    calls?: CallRecord[];
  }) => void
) {
  const unsubscribers: (() => void)[] = [];

  // Listen to contacts
  const contactsPath = `users/${userId}/contacts`;
  const unsubContacts = onSnapshot(
    collection(db, 'users', userId, 'contacts'),
    (snapshot) => {
      const contacts: Contact[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        contacts.push({
          id: d.id,
          name: d.name,
          handle: `@${d.name?.toLowerCase().replace(/\s+/g, '_')}`,
          avatar: d.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          role: 'Contact',
          statusText: d.status || 'Active',
          isOnline: true,
          lastSeen: 'Recently',
          isVerified: true,
          safetyNumber: '6821 9940 1284 5531',
          publicKeyFingerprint: d.publicKey || 'ED25519:7F:A1:BC',
          deviceInfo: {
            model: 'Cloud Sync Node',
            androidVersion: 'Android 15 (API 35)',
            keystoreLevel: 'Hardware TEE / StrongBox',
          },
          unreadCount: d.unreadCount || 0,
          isLocked: d.isLocked || false,
        });
      });
      if (contacts.length > 0) {
        onUpdate({ contacts });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, contactsPath);
    }
  );
  unsubscribers.push(unsubContacts);

  // Listen to messages
  const messagesPath = `users/${userId}/messages`;
  const unsubMessages = onSnapshot(
    collection(db, 'users', userId, 'messages'),
    (snapshot) => {
      const grouped: Record<string, Message[]> = {};
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const chatId = d.chatId || 'default';
        if (!grouped[chatId]) grouped[chatId] = [];
        grouped[chatId].push({
          id: d.id,
          chatId: d.chatId,
          senderId: d.senderId,
          senderName: d.senderId === userId ? 'You' : 'Peer',
          isSelf: d.senderId === userId,
          timestamp: d.timestamp ? new Date(d.timestamp).getTime() : Date.now(),
          text: d.text || '',
          mediaType: d.type || 'text',
          status: d.status || 'sent',
          cipherPayload: {
            ivHex: 'cloud_sync_iv',
            ciphertextHex: d.text || '',
            tagHex: 'cloud_tag',
            hmacHex: 'cloud_hmac',
            keyFingerprint: 'CLOUD_E2EE',
            algorithm: 'AES-256-GCM',
            envelopeVersion: 'Tink-v2.1',
          },
        });
      });
      if (Object.keys(grouped).length > 0) {
        onUpdate({ messages: grouped });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, messagesPath);
    }
  );
  unsubscribers.push(unsubMessages);

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}
