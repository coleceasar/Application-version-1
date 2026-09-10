/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Clock, Calendar, Send, ShieldCheck, Check } from 'lucide-react';

interface ScheduleMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageText: string;
  onConfirmSchedule: (scheduledTimestamp: number) => void;
}

export const ScheduleMessageModal: React.FC<ScheduleMessageModalProps> = ({
  isOpen,
  onClose,
  messageText,
  onConfirmSchedule,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<number | 'custom'>(5);
  const [customDateTime, setCustomDateTime] = useState<string>(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  });

  if (!isOpen) return null;

  const PRESETS = [
    { label: 'In 5 minutes', minutes: 5 },
    { label: 'In 30 minutes', minutes: 30 },
    { label: 'In 2 hours', minutes: 120 },
    { label: 'Tomorrow 9:00 AM', minutes: getMinutesUntilTomorrow9AM() },
  ];

  function getMinutesUntilTomorrow9AM(): number {
    const now = new Date();
    const tomorrow9 = new Date();
    tomorrow9.setDate(now.getDate() + 1);
    tomorrow9.setHours(9, 0, 0, 0);
    const diffMs = tomorrow9.getTime() - now.getTime();
    return Math.max(5, Math.round(diffMs / (1000 * 60)));
  }

  const handleConfirm = () => {
    let targetTime = Date.now();
    if (selectedPreset === 'custom') {
      const parsed = new Date(customDateTime).getTime();
      targetTime = isNaN(parsed) ? Date.now() + 5 * 60 * 1000 : parsed;
    } else {
      targetTime = Date.now() + selectedPreset * 60 * 1000;
    }

    onConfirmSchedule(targetTime);
    onClose();
  };

  return (
    <div
      id="schedule-message-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="schedule-message-card"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-neutral-900 border border-neutral-800 text-neutral-100 shadow-2xl p-5 flex flex-col space-y-4 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Schedule Message</h3>
              <p className="text-[11px] text-neutral-400">Encrypted dispatch at specified time</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 italic truncate">
          "{messageText || 'Encrypted Attachment'}"
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider font-mono">
            Send Time
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedPreset(p.minutes)}
                className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedPreset === p.minutes
                    ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 font-semibold'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <span>{p.label}</span>
                {selectedPreset === p.minutes && <Check className="w-3.5 h-3.5 text-teal-400" />}
              </button>
            ))}
          </div>

          {/* Custom Date & Time Picker Option */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setSelectedPreset('custom')}
              className={`w-full p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                selectedPreset === 'custom'
                  ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 font-semibold'
                  : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>Custom Date & Time</span>
              </span>
              {selectedPreset === 'custom' && <Check className="w-3.5 h-3.5 text-teal-400" />}
            </button>

            {selectedPreset === 'custom' && (
              <div className="mt-2 animate-in fade-in">
                <input
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-neutral-100 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
            )}
          </div>
        </div>

        {/* Schedule Action Button */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-neutral-950 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer"
        >
          <Clock className="w-4 h-4 text-neutral-950" />
          <span>Schedule Encrypted Dispatch</span>
        </button>
      </div>
    </div>
  );
};
