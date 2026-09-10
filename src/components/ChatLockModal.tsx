/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Lock, Fingerprint, KeyRound, ShieldCheck, AlertCircle } from 'lucide-react';
import { Contact } from '../types';

interface ChatLockModalProps {
  isOpen: boolean;
  contact: Contact | null;
  onClose: () => void;
  onUnlockSuccess: () => void;
}

export const ChatLockModal: React.FC<ChatLockModalProps> = ({
  isOpen,
  contact,
  onClose,
  onUnlockSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);

  if (!isOpen || !contact) return null;

  const handleKeyPress = (num: string) => {
    setError(false);
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setError(false);
    setPin((prev) => prev.slice(0, -1));
  };

  const verifyPin = (candidatePin: string) => {
    // Default passkey is 1234 (or any 4 digits in demo mode)
    if (candidatePin === '1234' || candidatePin.length === 4) {
      onUnlockSuccess();
      setPin('');
      setError(false);
    } else {
      setError(true);
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 1000);
    }
  };

  const handleBiometricAuth = () => {
    setIsBiometricScanning(true);
    setError(false);
    setTimeout(() => {
      setIsBiometricScanning(false);
      onUnlockSuccess();
      setPin('');
    }, 900);
  };

  return (
    <div
      id="chat-lock-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="chat-lock-card"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-3xl bg-neutral-900 border border-neutral-800 text-neutral-100 shadow-2xl p-6 flex flex-col items-center animate-in zoom-in-95 duration-150"
      >
        {/* Lock Icon and Header */}
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
          <Lock className="w-7 h-7" />
        </div>

        <h3 className="text-base font-semibold text-neutral-100 text-center">
          Locked Conversation
        </h3>
        <p className="text-xs text-neutral-400 text-center mt-1 mb-4">
          Authenticate to access encrypted messages with <strong className="text-neutral-200">{contact.name}</strong>
        </p>

        {/* PIN Indicators */}
        <div className="flex items-center gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                pin.length > i
                  ? error
                    ? 'bg-rose-500 border-rose-500'
                    : 'bg-teal-400 border-teal-400 scale-110'
                  : 'border-neutral-700 bg-neutral-800'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-[11px] text-rose-400 font-medium mb-3 flex items-center gap-1 animate-bounce">
            <AlertCircle className="w-3.5 h-3.5" />
            Incorrect PIN. Try 1234
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-12 rounded-2xl bg-neutral-800 hover:bg-neutral-700 active:bg-teal-600/30 text-base font-semibold text-neutral-100 transition-colors cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleBiometricAuth}
            className="h-12 rounded-2xl bg-neutral-800/80 hover:bg-neutral-700 text-teal-400 flex items-center justify-center transition-colors cursor-pointer"
            title="Biometric Fingerprint Unlock"
          >
            <Fingerprint className={`w-5 h-5 ${isBiometricScanning ? 'animate-pulse text-teal-300' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-2xl bg-neutral-800 hover:bg-neutral-700 active:bg-teal-600/30 text-base font-semibold text-neutral-100 transition-colors cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ⌫
          </button>
        </div>

        {/* Biometric Quick Trigger */}
        <button
          type="button"
          onClick={handleBiometricAuth}
          disabled={isBiometricScanning}
          className="w-full py-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Fingerprint className="w-4 h-4 text-teal-400" />
          <span>{isBiometricScanning ? 'Scanning Fingerprint...' : 'Android Biometric Unlock'}</span>
        </button>
      </div>
    </div>
  );
};
