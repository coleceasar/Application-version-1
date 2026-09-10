/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Phone, PhoneOff, Video, ShieldCheck } from 'lucide-react';
import { ActiveCallSession } from '../types';
import { callManager } from '../services/callManager';

interface IncomingCallBannerProps {
  session: ActiveCallSession | null;
}

export const IncomingCallBanner: React.FC<IncomingCallBannerProps> = ({ session }) => {
  if (!session || session.status !== 'incoming') return null;

  return (
    <div
      id="android-incoming-call-notification"
      className="absolute top-4 inset-x-4 z-50 rounded-3xl bg-neutral-900/95 border border-teal-500/50 shadow-2xl p-4 backdrop-blur-xl animate-in slide-in-from-top duration-300 select-none"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src={session.contact.avatar}
              alt={session.contact.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-teal-500"
            />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-teal-400 uppercase tracking-wider">
                {session.type === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
            </div>
            <h4 className="text-sm font-bold text-white truncate">
              {session.contact.name}
            </h4>
            <p className="text-[11px] text-neutral-400 truncate">
              DTLS-SRTP 256-bit AES-GCM
            </p>
          </div>
        </div>

        {/* Answer / Decline action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="decline-call-btn"
            type="button"
            onClick={() => callManager.declineCall()}
            className="w-11 h-11 rounded-full bg-neutral-800 hover:bg-neutral-700 text-red-400 hover:text-red-300 border border-neutral-700 flex items-center justify-center transition-all shadow-md active:scale-95"
            title="Decline"
          >
            <PhoneOff className="w-5 h-5" />
          </button>

          <button
            id="accept-call-btn"
            type="button"
            onClick={() => callManager.acceptCall()}
            className="w-11 h-11 rounded-full bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center transition-all shadow-lg shadow-teal-500/30 animate-pulse active:scale-95"
            title="Accept"
          >
            {session.type === 'video' ? (
              <Video className="w-5 h-5" />
            ) : (
              <Phone className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
