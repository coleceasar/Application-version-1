/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Radio,
  BatteryCharging,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Lock,
  Layers,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { NetworkType } from '../types';

interface AndroidFrameProps {
  children: React.ReactNode;
  currentNetwork: NetworkType;
  onLockApp: () => void;
  isTabletView: boolean;
  onToggleTabletView: () => void;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  currentNetwork,
  onLockApp,
  isTabletView,
  onToggleTabletView,
}) => {
  const [timeStr, setTimeStr] = useState('10:42');

  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setTimeStr(
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 10000);
    return () => clearInterval(timer);
  }, []);

  if (isTabletView) {
    return (
      <div className="w-full h-screen bg-neutral-950 flex flex-col overflow-hidden">
        {/* Tablet Top Status Bar */}
        <div className="h-7 px-4 bg-neutral-900 border-b border-neutral-800 text-[11px] text-neutral-300 flex items-center justify-between shrink-0 font-medium select-none">
          <div className="flex items-center gap-2">
            <span>{timeStr}</span>
            <span className="text-teal-400 flex items-center gap-1 font-mono text-[10px]">
              <ShieldCheck className="w-3 h-3 text-teal-400" />
              <span>AES-256 E2EE Enforced</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleTabletView}
              className="text-neutral-400 hover:text-neutral-200 flex items-center gap-1 text-[10px]"
            >
              <Smartphone className="w-3 h-3" />
              <span>Switch to Phone Frame</span>
            </button>

            <div className="flex items-center gap-1 font-mono text-[10px]">
              {currentNetwork === 'WIFI' && <Wifi className="w-3 h-3 text-teal-400" />}
              {currentNetwork === 'OFFLINE' ? (
                <span className="text-amber-400">Offline</span>
              ) : (
                <span className="text-teal-400">{currentNetwork}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px]">98%</span>
              <BatteryCharging className="w-3.5 h-3.5 text-teal-400" />
            </div>
          </div>
        </div>

        {/* Tablet Content View */}
        <div className="flex-1 flex overflow-hidden">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-2 sm:p-4 overflow-x-hidden">
      {/* Top Floating Control Bar */}
      <div className="w-full max-w-sm mb-2 flex items-center justify-between px-2 text-xs text-neutral-400">
        <div className="flex items-center gap-1.5 font-medium text-neutral-300">
          <Smartphone className="w-3.5 h-3.5 text-teal-400" />
          <span>Google Pixel 8 Pro (API 34)</span>
        </div>
        <button
          id="toggle-tablet-view-btn"
          type="button"
          onClick={onToggleTabletView}
          className="hover:text-teal-300 flex items-center gap-1 text-[11px] transition-colors py-0.5 px-2 rounded-lg bg-neutral-900 border border-neutral-800"
        >
          <Tablet className="w-3 h-3" />
          <span>Tablet / Desktop Mode</span>
        </button>
      </div>

      {/* Android Device Frame (Pixel 8 Pro Bezels) */}
      <div className="relative w-full max-w-[410px] h-[850px] max-h-[92vh] bg-black rounded-[48px] p-2.5 shadow-2xl border-4 border-neutral-800 ring-1 ring-neutral-700/60 flex flex-col overflow-hidden">
        {/* Device Inner Screen Container */}
        <div className="relative w-full h-full bg-neutral-950 rounded-[40px] flex flex-col overflow-hidden">
          {/* Android 14 Status Bar */}
          <div className="h-8 px-5 bg-neutral-900/90 backdrop-blur-md text-[11px] text-neutral-300 flex items-center justify-between shrink-0 font-medium select-none z-30">
            {/* Left: Clock */}
            <div className="flex items-center gap-1 font-semibold text-xs tracking-tight">
              <span>{timeStr}</span>
            </div>

            {/* Center: Camera Punch-Hole */}
            <div className="w-3.5 h-3.5 rounded-full bg-black border border-neutral-800/80 shrink-0" />

            {/* Right: Connectivity & Battery Icons */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {currentNetwork === 'WIFI' && <Wifi className="w-3 h-3 text-teal-400" />}
                {currentNetwork === 'OFFLINE' ? (
                  <Radio className="w-3 h-3 text-amber-400 rotate-45" />
                ) : (
                  <span className="text-[10px] font-bold text-teal-400 font-mono">
                    {currentNetwork}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px]">98%</span>
                <BatteryCharging className="w-3.5 h-3.5 text-teal-400" />
              </div>
            </div>
          </div>

          {/* App Body Content */}
          <div className="flex-1 flex flex-col overflow-hidden relative">{children}</div>

          {/* Android 14 Bottom Gesture Pill */}
          <div className="h-4 bg-neutral-950 flex items-center justify-center shrink-0 z-30">
            <div className="w-28 h-1 rounded-full bg-neutral-600 hover:bg-neutral-400 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
};
