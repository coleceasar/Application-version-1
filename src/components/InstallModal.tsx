/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Download,
  Smartphone,
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Share2,
} from 'lucide-react';
import { usePWAInstall } from '../services/usePWAInstall';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios' | 'desktop'>('android');

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    }
  };

  return (
    <div
      id="install-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="install-modal-card"
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-neutral-100 max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Download on Your Phone</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  PWA
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Install CipherDroid as a standalone mobile app
              </p>
            </div>
          </div>
          <button
            id="close-install-modal-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status if already installed */}
          {isInstalled ? (
            <div className="p-3.5 rounded-2xl bg-teal-950/50 border border-teal-800/60 flex items-center gap-3 text-teal-300 text-xs">
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
              <div>
                <p className="font-semibold text-teal-200">Already Installed!</p>
                <p className="text-[11px] text-teal-300/80">
                  CipherDroid is running in standalone mode with offline AES-256 storage and hardware Keystore integration.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Direct Install Button if browser supports it */}
              {isInstallable && (
                <button
                  id="direct-pwa-install-btn"
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Download & Install Now</span>
                </button>
              )}

              {/* Platform Selector Tabs */}
              <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedPlatform('android')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                    selectedPlatform === 'android'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Android
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlatform('ios')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                    selectedPlatform === 'ios'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  iPhone / iOS
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlatform('desktop')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                    selectedPlatform === 'desktop'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  QR Code
                </button>
              </div>

              {/* Android Instructions */}
              {selectedPlatform === 'android' && (
                <div className="space-y-3 p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-xs">
                  <h4 className="font-semibold text-teal-400 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>How to Install on Android (Chrome)</span>
                  </h4>
                  <ol className="space-y-2.5 text-neutral-300 text-[11px] list-decimal list-inside leading-relaxed">
                    <li>
                      Open this web address in <strong>Google Chrome</strong> on your phone.
                    </li>
                    <li>
                      Tap the <strong>three dots menu ⋮</strong> in the top-right corner.
                    </li>
                    <li>
                      Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                    </li>
                    <li>
                      Tap <strong>Install</strong> to add CipherDroid directly to your Android app drawer with full offline access!
                    </li>
                  </ol>
                </div>
              )}

              {/* iOS Instructions */}
              {selectedPlatform === 'ios' && (
                <div className="space-y-3 p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-xs">
                  <h4 className="font-semibold text-teal-400 flex items-center gap-1.5">
                    <Share2 className="w-4 h-4" />
                    <span>How to Install on iPhone (Safari)</span>
                  </h4>
                  <ol className="space-y-2.5 text-neutral-300 text-[11px] list-decimal list-inside leading-relaxed">
                    <li>
                      Open this URL in <strong>Apple Safari</strong> on your iPhone.
                    </li>
                    <li>
                      Tap the <strong>Share icon ⎋</strong> at the bottom of the screen.
                    </li>
                    <li>
                      Scroll down and tap <strong>&quot;Add to Home Screen&quot; [+]</strong>.
                    </li>
                    <li>
                      Tap <strong>Add</strong> in the top-right corner. CipherDroid will launch full-screen from your home screen.
                    </li>
                  </ol>
                </div>
              )}

              {/* QR Code view */}
              {selectedPlatform === 'desktop' && (
                <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col items-center text-center space-y-3">
                  <div className="p-2.5 bg-white rounded-2xl shadow-xl">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                        currentUrl
                      )}`}
                      alt="Scan to open on phone"
                      className="w-36 h-36 rounded-lg"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-300 max-w-xs leading-relaxed">
                    Point your smartphone camera at this QR code to immediately open CipherDroid on your phone, then tap <strong>Install</strong>.
                  </p>
                </div>
              )}

              {/* Copy URL section */}
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Share App Link to Phone:</span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 text-teal-400 hover:text-teal-300 font-medium"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300 truncate select-all">
                  {currentUrl}
                </div>
              </div>

              {/* Offline & Hardware Security Notice */}
              <div className="flex items-center gap-2 px-2 text-[11px] text-neutral-400">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Service Worker & Offline AES-256 Storage are pre-cached.</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
