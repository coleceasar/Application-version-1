/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldAlert, ShieldCheck, Flame, Eye, Lock } from 'lucide-react';
import { Message } from '../types';

interface ViewOnceModalProps {
  isOpen: boolean;
  message: Message | null;
  onClose: () => void;
}

export const ViewOnceModal: React.FC<ViewOnceModalProps> = ({
  isOpen,
  message,
  onClose,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(15);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    setSecondsRemaining(15);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onCloseRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen || !message) return null;

  const isVideo = message.mediaType === 'video';

  return (
    <div
      id="view-once-modal-overlay"
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-200 select-none"
    >
      {/* Top Security Bar */}
      <div className="p-4 flex items-center justify-between border-b border-neutral-800/80 bg-neutral-950/80 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 font-bold text-xs font-mono">
            1
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-1.5">
              <span>View-Once {isVideo ? 'Video' : 'Photo'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Self-Destructs On Close
              </span>
            </h3>
            <p className="text-[11px] text-neutral-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-teal-400" />
              <span>Decrypted from AES-256-GCM envelope • Auto-closes in {secondsRemaining}s</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>Close & Destroy</span>
        </button>
      </div>

      {/* Main Content Viewer */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle dynamic security watermark */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 font-mono text-2xl text-neutral-400 rotate-12 select-none">
          CIPHERDROID • VIEW ONCE • PROTECTED
        </div>

        {isVideo ? (
          <video
            src={message.mediaUrl}
            controls
            autoPlay
            playsInline
            className="max-h-[70vh] max-w-full rounded-2xl border border-neutral-800 shadow-2xl object-contain"
          />
        ) : (
          <img
            src={message.mediaUrl}
            alt="View Once Encrypted Media"
            className="max-h-[70vh] max-w-full rounded-2xl border border-neutral-800 shadow-2xl object-contain pointer-events-none"
            onContextMenu={(e) => e.preventDefault()}
          />
        )}
      </div>

      {/* Bottom Disclaimer */}
      <div className="p-3 bg-neutral-950/90 border-t border-neutral-800/80 text-center shrink-0">
        <p className="text-xs text-neutral-400 flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>This media cannot be saved or forwarded. Once closed, it will permanently expire.</span>
        </p>
      </div>
    </div>
  );
};
