/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CipherPayload } from '../types';

// Convert Uint8Array to Hex string
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Hex string to Uint8Array
export function hexToBuffer(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Convert Uint8Array to Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Global ECDH Key Pairs for the local user and contact session simulation
interface CryptoSession {
  localKeyPair?: CryptoKeyPair;
  contactKeys: Map<string, CryptoKey>; // Derived AES-256-GCM symmetric keys
  rawSharedFingerprints: Map<string, string>;
}

const sessionStore: CryptoSession = {
  contactKeys: new Map(),
  rawSharedFingerprints: new Map(),
};

/**
 * Initialize local device cryptographic identity in Android Keystore / Tink simulation
 */
export async function initializeCryptoIdentity(): Promise<{
  publicKeyHex: string;
  fingerprint: string;
}> {
  if (!sessionStore.localKeyPair) {
    // Generate ECDH P-256 key pair
    sessionStore.localKeyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      false, // non-extractable private key simulating Android Keystore hardware protection
      ['deriveKey', 'deriveBits']
    );
  }

  // Export public key for identity fingerprinting
  const exportedPublic = await window.crypto.subtle.exportKey(
    'spki',
    sessionStore.localKeyPair.publicKey
  );
  const pubHex = bufferToHex(exportedPublic);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', exportedPublic);
  const fingerprint = bufferToHex(hashBuffer).substring(0, 16).toUpperCase();

  return { publicKeyHex: pubHex, fingerprint };
}

/**
 * Get or derive the shared 256-bit AES-GCM session key for a peer
 */
export async function getOrCreatePeerSessionKey(peerId: string): Promise<{
  cryptoKey: CryptoKey;
  fingerprint: string;
}> {
  if (sessionStore.contactKeys.has(peerId)) {
    return {
      cryptoKey: sessionStore.contactKeys.get(peerId)!,
      fingerprint: sessionStore.rawSharedFingerprints.get(peerId) || 'SEC_P256_ECDH',
    };
  }

  if (!sessionStore.localKeyPair) {
    await initializeCryptoIdentity();
  }

  // Generate simulated peer public ECDH key (as received from /keys/user/:id)
  const peerKeyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );

  // Derive shared bits via ECDH
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: peerKeyPair.publicKey,
    },
    sessionStore.localKeyPair!.privateKey,
    256
  );

  // Import into AES-GCM 256-bit symmetric key
  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const digest = await window.crypto.subtle.digest('SHA-256', derivedBits);
  const fingerprint = bufferToHex(digest).substring(0, 16).toUpperCase();

  sessionStore.contactKeys.set(peerId, aesKey);
  sessionStore.rawSharedFingerprints.set(peerId, fingerprint);

  return { cryptoKey: aesKey, fingerprint };
}

/**
 * Encrypt plaintext using AES-256-GCM with a random 96-bit IV
 */
export async function encryptPayload(
  text: string,
  peerId: string
): Promise<CipherPayload> {
  const { cryptoKey, fingerprint } = await getOrCreatePeerSessionKey(peerId);

  // 12-byte (96-bit) IV is standard and optimal for AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(text);

  // Web Crypto AES-GCM appends the 16-byte (128-bit) auth tag to the end of the ciphertext
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // 128-bit authentication tag
    },
    cryptoKey,
    encodedText
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  // Split ciphertext from the 16-byte auth tag
  const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const tagBytes = encryptedBytes.slice(encryptedBytes.length - 16);

  // Compute HMAC integrity verification simulating Google Tink envelope
  const hmacKey = await window.crypto.subtle.importKey(
    'raw',
    iv,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const hmacSignature = await window.crypto.subtle.sign('HMAC', hmacKey, ciphertextBytes);

  return {
    ivHex: bufferToHex(iv),
    ciphertextHex: bufferToHex(ciphertextBytes),
    tagHex: bufferToHex(tagBytes),
    hmacHex: bufferToHex(hmacSignature).substring(0, 32),
    keyFingerprint: fingerprint,
    algorithm: 'AES-256-GCM',
    envelopeVersion: 'GoogleTink-Keystore-v2',
  };
}

/**
 * Decrypt AES-256-GCM ciphertext payload back to plaintext
 */
export async function decryptPayload(
  cipher: CipherPayload,
  peerId: string
): Promise<string> {
  try {
    const { cryptoKey } = await getOrCreatePeerSessionKey(peerId);
    const iv = hexToBuffer(cipher.ivHex);
    const ciphertext = hexToBuffer(cipher.ciphertextHex);
    const tag = hexToBuffer(cipher.tagHex);

    // Recombine ciphertext and 16-byte tag for Web Crypto AES-GCM
    const combined = new Uint8Array(ciphertext.length + tag.length);
    combined.set(ciphertext);
    combined.set(tag, ciphertext.length);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      cryptoKey,
      combined
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.error('Decryption error:', err);
    return '[Decryption failed: Authentication tag mismatch or corrupted key]';
  }
}

/**
 * Hash 6-digit passkey with PBKDF2 (10,000 iterations of SHA-256)
 */
export async function hashPasskey(pin: string, salt: string = 'CipherDroid_Salt_2026'): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 10000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return bufferToHex(derivedBits);
}

/**
 * Generate 60-digit Signal-style Safety Number formatted into 12 blocks of 5 digits
 */
export function formatSafetyNumber(seed: string): string {
  // Deterministic 60-digit string based on peer fingerprint
  let numStr = '';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  let current = Math.abs(hash);
  while (numStr.length < 60) {
    current = (current * 1664525 + 1013904223) % 4294967296;
    numStr += current.toString().padStart(10, '0');
  }
  numStr = numStr.substring(0, 60);

  // Group into 12 blocks of 5 digits
  const blocks: string[] = [];
  for (let i = 0; i < 60; i += 5) {
    blocks.push(numStr.substring(i, i + 5));
  }
  return blocks.join(' ');
}
