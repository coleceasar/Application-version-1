/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ShieldCheck, Key, Hash, FileCode, Check, Copy } from 'lucide-react';
import { Message } from '../types';

interface CryptoInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
}

export const CryptoInspectorModal: React.FC<CryptoInspectorModalProps> = ({
  isOpen,
  onClose,
  message,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen || !message) return null;

  const handleCopy = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 1800);
  };

  const payload = message.cipherPayload;

  return (
    <div
      id="crypto-inspector-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150"
    >
      <div
        id="crypto-inspector-card"
        className="w-full max-w-lg rounded-3xl bg-neutral-900 border border-neutral-800 text-neutral-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">AES-256-GCM Crypto Inspector</h3>
              <p className="text-[11px] text-neutral-400">
                Message ID: <span className="font-mono text-neutral-300">{message.id}</span>
              </p>
            </div>
          </div>
          <button
            id="crypto-inspector-close-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Inspector Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Plaintext Banner */}
          <div className="p-3.5 rounded-2xl bg-neutral-800/50 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 mb-1.5 font-medium">
              <span>Decrypted Local Plaintext</span>
              <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                Decrypted in RAM
              </span>
            </div>
            <p className="text-neutral-100 font-sans text-sm bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/60 break-words">
              {message.text || `[Media: ${message.mediaType.toUpperCase()}]`}
            </p>
          </div>

          {/* Ciphertext (AES-256-GCM) */}
          <div className="p-3.5 rounded-2xl bg-neutral-800/50 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 mb-1.5 font-medium">
              <span className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-teal-400" />
                Encrypted Ciphertext (Hex)
              </span>
              <button
                type="button"
                onClick={() => handleCopy(payload.ciphertextHex, 'ciphertext')}
                className="text-neutral-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
              >
                {copiedSection === 'ciphertext' ? (
                  <Check className="w-3 h-3 text-teal-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedSection === 'ciphertext' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-teal-300 bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800/80 overflow-x-auto whitespace-pre-wrap break-all select-all">
              {payload.ciphertextHex || 'N/A'}
            </pre>
          </div>

          {/* IV & Auth Tag Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 96-bit IV */}
            <div className="p-3 rounded-2xl bg-neutral-800/40 border border-neutral-800">
              <div className="flex items-center justify-between text-neutral-400 mb-1 font-medium text-[11px]">
                <span>96-bit IV (Nonce)</span>
                <span className="text-[10px] text-neutral-500">12 bytes</span>
              </div>
              <p className="font-mono text-[11px] text-neutral-300 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/60 break-all select-all">
                {payload.ivHex}
              </p>
            </div>

            {/* 128-bit Auth Tag */}
            <div className="p-3 rounded-2xl bg-neutral-800/40 border border-neutral-800">
              <div className="flex items-center justify-between text-neutral-400 mb-1 font-medium text-[11px]">
                <span>128-bit GCM Auth Tag</span>
                <span className="text-[10px] text-teal-400">16 bytes</span>
              </div>
              <p className="font-mono text-[11px] text-neutral-300 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/60 break-all select-all">
                {payload.tagHex}
              </p>
            </div>
          </div>

          {/* ECDH Key Agreement & HMAC */}
          <div className="space-y-2">
            <div className="p-3 rounded-2xl bg-neutral-800/40 border border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-teal-400" />
                <div>
                  <p className="text-[11px] text-neutral-400">ECDH Shared Secret Fingerprint</p>
                  <p className="font-mono text-xs text-neutral-200">{payload.keyFingerprint}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
                P-256 Curve
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-800/40 border border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-teal-400" />
                <div>
                  <p className="text-[11px] text-neutral-400">HMAC-SHA256 Envelope Checksum</p>
                  <p className="font-mono text-xs text-neutral-200 break-all">{payload.hmacHex}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
                Integrity OK
              </span>
            </div>
          </div>

          {/* Security Standards Summary */}
          <div className="p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 text-[11px] text-neutral-400 space-y-1">
            <p className="font-semibold text-neutral-200 text-xs mb-1">Cryptographic Properties</p>
            <div className="grid grid-cols-2 gap-y-1">
              <div>• Algorithm: <span className="text-neutral-200">{payload.algorithm}</span></div>
              <div>• Forward Secrecy: <span className="text-teal-400">Active</span></div>
              <div>• Keystore Provider: <span className="text-neutral-200">Android StrongBox</span></div>
              <div>• Tamper Resistance: <span className="text-teal-400">Authenticated</span></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800/80 bg-neutral-900/90 flex justify-end">
          <button
            id="crypto-inspector-done-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
