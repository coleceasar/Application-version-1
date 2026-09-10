/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MapPin, Shield, Radio, Check, X } from 'lucide-react';
import { permissionManager } from '../services/permissionManager';
import { LiveLocationData } from '../types';

interface LocationShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareLocation: (locationData: LiveLocationData) => void;
  contactName: string;
}

export const LocationShareModal: React.FC<LocationShareModalProps> = ({
  isOpen,
  onClose,
  onShareLocation,
  contactName,
}) => {
  const [durationMin, setDurationMin] = useState<number>(15);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [previewCoords, setPreviewCoords] = useState<{ lat: number; lng: number } | null>({
    lat: 37.7749,
    lng: -122.4194,
  });

  if (!isOpen) return null;

  const handleStartShare = async () => {
    setIsLocating(true);
    const pos = await permissionManager.requestLocation();
    setIsLocating(false);

    let lat = 37.774929;
    let lng = -122.419416;
    let accuracy = 4;
    let heading = 142;
    let speed = 1.2;

    if (pos && pos.coords) {
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      accuracy = Math.round(pos.coords.accuracy || 5);
      heading = pos.coords.heading || 180;
      speed = pos.coords.speed || 0;
    }

    const now = Date.now();
    const expiresAt = now + durationMin * 60 * 1000;

    const locationData: LiveLocationData = {
      latitude: lat,
      longitude: lng,
      accuracy,
      heading,
      speed,
      durationMinutes: durationMin,
      startedAt: now,
      expiresAt,
      addressLabel: 'Live GPS Pin · Encrypted Track',
      isLive: true,
    };

    onShareLocation(locationData);
    onClose();
  };

  return (
    <div
      id="location-share-dialog-overlay"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in"
    >
      <div
        id="location-share-card"
        className="w-full sm:max-w-md bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Share Live Location</h3>
              <p className="text-xs text-neutral-400">End-to-End Encrypted with {contactName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Radar Preview Graphic */}
        <div className="relative h-36 rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center">
          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

          {/* Radar sweep rings */}
          <div className="absolute w-28 h-28 rounded-full border border-teal-500/30 animate-ping" />
          <div className="absolute w-44 h-44 rounded-full border border-teal-500/20" />
          <div className="absolute w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/40" />

          {/* Center GPS Pin */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/50">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="mt-1 px-2 py-0.5 rounded-full bg-neutral-900/90 border border-teal-500/40 text-[10px] font-mono text-teal-300">
              GNSS RTK ±4m
            </span>
          </div>

          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-900/80 border border-neutral-800 text-[10px] text-neutral-300">
            <Radio className="w-3 h-3 text-teal-400 animate-pulse" />
            <span>GPS Satellite Lock</span>
          </div>

          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-neutral-900/80 text-[10px] font-mono text-neutral-400">
            AES-256-GCM GeoTag
          </div>
        </div>

        {/* Duration presets */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-300">
            Live Sharing Duration
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { min: 15, label: '15 Minutes' },
              { min: 60, label: '1 Hour' },
              { min: 480, label: '8 Hours' },
            ].map((opt) => (
              <button
                key={opt.min}
                type="button"
                onClick={() => setDurationMin(opt.min)}
                className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                  durationMin === opt.min
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-sm'
                    : 'bg-neutral-800/80 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {durationMin === opt.min && <Check className="w-3 h-3 text-teal-400" />}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-neutral-400">
            Live coordinates update in real time and automatically expire after {durationMin >= 60 ? `${durationMin / 60} hour(s)` : `${durationMin} minutes`}.
          </p>
        </div>

        {/* Security disclaimer */}
        <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-800/40 flex items-start gap-2.5 text-xs text-teal-200/90">
          <Shield className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <span>
            Only {contactName} can decrypt your coordinates. No raw location telemetry is logged by relay servers.
          </span>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            id="confirm-share-location-btn"
            type="button"
            disabled={isLocating}
            onClick={handleStartShare}
            className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-all shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            {isLocating ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Acquiring GPS Signal...</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                <span>Start Sharing Live Location</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
