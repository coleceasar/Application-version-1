/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PhoneOff, Maximize2, Mic, MicOff, ShieldCheck } from 'lucide-react';
import { ActiveCallSession } from '../types';
import { callManager } from '../services/callManager';

interface MiniCallOverlayProps {
  session: ActiveCallSession | null;
  onMaximize: () => void;
}

export const MiniCallOverlay: React.FC<MiniCallOverlayProps> = ({ session, onMaximize }) => {
  if (!session || session.status === 'idle' || session.status === 'incoming') return null;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div
      id="mini-call-pip-overlay"
      className="absolute bottom-20 right-4 z-40 bg-neutral-900/95 border border-teal-500/50 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex items-center gap-3 select-none animate-in fade-in"
    >
      <div
        onClick={onMaximize}
        className="flex items-center gap-2.5 cursor-pointer hover:opacity-90"
      >
        <div className="relative">
          <img
            src={session.contact.avatar}
            alt={session.contact.name}
            className="w-9 h-9 rounded-full object-cover border border-teal-500"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-teal-500 flex items-center justify-center text-[8px] text-white">
            <ShieldCheck className="w-2.5 h-2.5" />
          </span>
        </div>

        <div>
          <div className="text-xs font-semibold text-white leading-tight">
            {session.contact.name.split(' ')[0]}
          </div>
          <div className="text-[10px] font-mono text-teal-300">
            {formatDuration(session.durationSeconds)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pl-1 border-l border-neutral-800">
        <button
          type="button"
          onClick={() => callManager.toggleMute()}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
            session.isMuted
              ? 'bg-amber-500/20 text-amber-300'
              : 'hover:bg-neutral-800 text-neutral-300'
          }`}
          title={session.isMuted ? 'Unmute' : 'Mute'}
        >
          {session.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={onMaximize}
          className="w-7 h-7 rounded-full hover:bg-neutral-800 text-neutral-300 flex items-center justify-center transition-colors"
          title="Full screen call"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => callManager.endCall()}
          className="w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow-sm"
          title="End Call"
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
