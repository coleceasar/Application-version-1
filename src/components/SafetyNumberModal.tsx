/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ShieldCheck, QrCode, Smartphone, Check, AlertCircle } from 'lucide-react';
import { Contact } from '../types';

interface SafetyNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact;
  onToggleVerification: (contactId: string, verified: boolean) => void;
}

export const SafetyNumberModal: React.FC<SafetyNumberModalProps> = ({
  isOpen,
  onClose,
  contact,
  onToggleVerification,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(contact.safetyNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const blocks = contact.safetyNumber.split(' ');

  return (
    <div
      id="safety-number-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150"
    >
      <div
        id="safety-number-card"
        className="w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-800 text-neutral-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Verify Safety Number</h3>
              <p className="text-[11px] text-neutral-400">{contact.name}</p>
            </div>
          </div>
          <button
            id="safety-number-close-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Explanation */}
          <div className="p-3 rounded-2xl bg-neutral-800/40 border border-neutral-800/80 flex items-start gap-2.5 text-neutral-300 text-[11px]">
            <AlertCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <p>
              Compare this safety number with <span className="font-semibold text-neutral-100">{contact.name}</span> in person or over an end-to-end encrypted channel to verify no man-in-the-middle exists.
            </p>
          </div>

          {/* Simulated QR Code */}
          <div className="flex flex-col items-center">
            <div className="p-4 rounded-2xl bg-white text-black shadow-lg flex items-center justify-center">
              <div className="w-40 h-40 relative flex items-center justify-center border-4 border-neutral-900 rounded-lg p-1 bg-white">
                {/* SVG QR Code Pattern */}
                <svg viewBox="0 0 100 100" className="w-full h-full fill-black">
                  {/* Outer corner markers */}
                  <rect x="5" y="5" width="25" height="25" fill="black" />
                  <rect x="9" y="9" width="17" height="17" fill="white" />
                  <rect x="13" y="13" width="9" height="9" fill="black" />

                  <rect x="70" y="5" width="25" height="25" fill="black" />
                  <rect x="74" y="9" width="17" height="17" fill="white" />
                  <rect x="78" y="13" width="9" height="9" fill="black" />

                  <rect x="5" y="70" width="25" height="25" fill="black" />
                  <rect x="9" y="74" width="17" height="17" fill="white" />
                  <rect x="13" y="78" width="9" height="9" fill="black" />

                  {/* High entropy simulated QR data matrix */}
                  <rect x="36" y="8" width="5" height="5" />
                  <rect x="46" y="12" width="5" height="5" />
                  <rect x="56" y="8" width="5" height="5" />
                  <rect x="40" y="24" width="5" height="5" />
                  <rect x="52" y="20" width="5" height="5" />
                  <rect x="8" y="38" width="5" height="5" />
                  <rect x="20" y="44" width="5" height="5" />
                  <rect x="14" y="54" width="5" height="5" />
                  <rect x="34" y="34" width="8" height="8" />
                  <rect x="48" y="36" width="6" height="6" />
                  <rect x="62" y="38" width="5" height="5" />
                  <rect x="78" y="42" width="6" height="6" />
                  <rect x="88" y="34" width="5" height="5" />
                  <rect x="36" y="50" width="6" height="6" />
                  <rect x="48" y="52" width="8" height="8" />
                  <rect x="64" y="54" width="6" height="6" />
                  <rect x="80" y="58" width="5" height="5" />
                  <rect x="88" y="68" width="5" height="5" />
                  <rect x="74" y="78" width="6" height="6" />
                  <rect x="84" y="84" width="5" height="5" />
                  <rect x="38" y="68" width="5" height="5" />
                  <rect x="46" y="76" width="6" height="6" />
                  <rect x="58" y="70" width="6" height="6" />
                  <rect x="42" y="86" width="6" height="6" />
                  <rect x="56" y="84" width="5" height="5" />
                </svg>
              </div>
            </div>
            <p className="text-[11px] text-neutral-400 mt-2">Scan with partner's camera</p>
          </div>

          {/* 60-digit 12-block safety number representation */}
          <div>
            <div className="flex items-center justify-between text-neutral-400 mb-2 font-medium">
              <span>60-Digit Numeric Fingerprint</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{copied ? 'Copied' : 'Copy All'}</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800/80 font-mono text-center text-sm font-semibold text-neutral-200 tracking-wider">
              {blocks.map((b, idx) => (
                <div key={idx} className="bg-neutral-900/80 py-1.5 px-2 rounded-lg border border-neutral-800/60">
                  {b}
                </div>
              ))}
            </div>
          </div>

          {/* Device and Keystore metadata */}
          <div className="p-3 rounded-2xl bg-neutral-800/40 border border-neutral-800/80 text-[11px] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-neutral-400" />
                Peer Device
              </span>
              <span className="text-neutral-200 font-medium">{contact.deviceInfo.model}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Keystore Level</span>
              <span className="text-teal-400 font-medium">{contact.deviceInfo.keystoreLevel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">ECDH Identity Key</span>
              <span className="font-mono text-neutral-300">{contact.publicKeyFingerprint}</span>
            </div>
          </div>

          {/* Mark as Verified Switch */}
          <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-100">Mark as Verified</p>
              <p className="text-[11px] text-neutral-400">
                Show shield badge confirming safety number match
              </p>
            </div>
            <button
              id="toggle-safety-verified-btn"
              type="button"
              onClick={() => onToggleVerification(contact.id, !contact.isVerified)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                contact.isVerified ? 'bg-teal-500' : 'bg-neutral-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  contact.isVerified ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800/80 bg-neutral-900/90 flex justify-end">
          <button
            id="safety-number-done-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
