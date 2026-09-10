/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Image as ImageIcon,
  X,
  Check,
  Upload,
  Sparkles,
  Sliders,
  Shield,
  Palette,
  Eye,
  Trash2,
} from 'lucide-react';
import { WallpaperOption } from '../types';

export const PRESET_WALLPAPERS: WallpaperOption[] = [
  {
    id: 'default',
    name: 'Default Minimalist',
    type: 'color',
    value: '#0a0a0a',
    preview: '#0a0a0a',
  },
  {
    id: 'cyber-grid',
    name: 'Cyber Grid',
    type: 'pattern',
    value: 'radial-gradient(circle at 50% 50%, #0d1f2d 0%, #050a0f 100%), repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(45, 212, 191, 0.05) 24px, rgba(45, 212, 191, 0.05) 25px), repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(45, 212, 191, 0.05) 24px, rgba(45, 212, 191, 0.05) 25px)',
    preview: 'linear-gradient(135deg, #0d1f2d 0%, #050a0f 100%)',
  },
  {
    id: 'matrix-terminal',
    name: 'Matrix Terminal',
    type: 'pattern',
    value: 'linear-gradient(180deg, rgba(5, 20, 10, 0.95) 0%, rgba(2, 8, 4, 0.98) 100%)',
    preview: 'linear-gradient(180deg, #052e16 0%, #022c22 100%)',
  },
  {
    id: 'midnight-navy',
    name: 'Midnight Navy',
    type: 'gradient',
    value: 'linear-gradient(145deg, #081226 0%, #020617 100%)',
    preview: 'linear-gradient(145deg, #081226 0%, #020617 100%)',
  },
  {
    id: 'emerald-vault',
    name: 'Emerald Vault',
    type: 'gradient',
    value: 'linear-gradient(145deg, #062419 0%, #02120b 100%)',
    preview: 'linear-gradient(145deg, #062419 0%, #02120b 100%)',
  },
  {
    id: 'tactical-carbon',
    name: 'Tactical Slate',
    type: 'pattern',
    value: 'linear-gradient(135deg, #171717 25%, #1c1c1c 25%, #1c1c1c 50%, #171717 50%, #171717 75%, #1c1c1c 75%, #1c1c1c 100%)',
    preview: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
  },
  {
    id: 'deep-space',
    name: 'Deep Nebula',
    type: 'gradient',
    value: 'linear-gradient(135deg, #1e1035 0%, #090314 100%)',
    preview: 'linear-gradient(135deg, #2e1065 0%, #0f0728 100%)',
  },
];

interface ChatWallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallpaper?: string;
  currentOpacity?: number;
  contactName?: string;
  onSaveWallpaper: (wallpaperValue: string, opacity: number, applyToAll: boolean) => void;
  hasMediaPermission: boolean;
  onRequestMediaPermission: () => void;
}

export const ChatWallpaperModal: React.FC<ChatWallpaperModalProps> = ({
  isOpen,
  onClose,
  currentWallpaper = '#0a0a0a',
  currentOpacity = 100,
  contactName,
  onSaveWallpaper,
  hasMediaPermission,
  onRequestMediaPermission,
}) => {
  const [selectedWallpaper, setSelectedWallpaper] = useState<string>(currentWallpaper);
  const [opacity, setOpacity] = useState<number>(currentOpacity);
  const [applyToAll, setApplyToAll] = useState<boolean>(false);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(
    currentWallpaper.startsWith('data:') || currentWallpaper.startsWith('http') ? currentWallpaper : null
  );

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check permission first as requested
    if (!hasMediaPermission) {
      onRequestMediaPermission();
      return;
    }

    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setCustomImageUrl(result);
          setSelectedWallpaper(`url(${result})`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPreset = (preset: WallpaperOption) => {
    setSelectedWallpaper(preset.value);
  };

  const handleSave = () => {
    onSaveWallpaper(selectedWallpaper, opacity, applyToAll);
    onClose();
  };

  const handleResetDefault = () => {
    setSelectedWallpaper('#0a0a0a');
    setCustomImageUrl(null);
    setOpacity(100);
  };

  return (
    <div
      id="chat-wallpaper-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in"
    >
      <div
        id="chat-wallpaper-card"
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Chat Wallpaper
                {contactName && (
                  <span className="text-xs font-normal text-neutral-400 truncate max-w-[150px]">
                    for {contactName}
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400">
                Customize cryptographic backdrop & legibility
              </p>
            </div>
          </div>
          <button
            id="close-wallpaper-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Live Preview Card */}
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-teal-400" />
              Live Chat Preview
            </label>
            <div
              className="relative w-full h-40 rounded-2xl border border-neutral-700 overflow-hidden p-3.5 flex flex-col justify-between shadow-inner"
              style={{
                background: selectedWallpaper.startsWith('url')
                  ? `${selectedWallpaper} center/cover no-repeat`
                  : selectedWallpaper,
                opacity: opacity / 100,
              }}
            >
              {/* Sample Received Message */}
              <div className="self-start max-w-[75%] p-2.5 rounded-2xl rounded-tl-sm bg-neutral-900/90 border border-neutral-700/80 backdrop-blur-md shadow-md">
                <p className="text-xs text-neutral-200">
                  AES-256-GCM encrypted message packet.
                </p>
                <span className="text-[9px] text-neutral-400 mt-1 block">10:42 AM</span>
              </div>

              {/* Sample Sent Message */}
              <div className="self-end max-w-[75%] p-2.5 rounded-2xl rounded-tr-sm bg-teal-600/90 text-white backdrop-blur-md shadow-md">
                <p className="text-xs text-white">
                  Verified with hardware StrongBox key!
                </p>
                <span className="text-[9px] text-teal-200 mt-1 block text-right">10:43 AM • Read</span>
              </div>
            </div>
          </div>

          {/* Preset Themes Grid */}
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              Curated Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PRESET_WALLPAPERS.map((preset) => {
                const isSelected = selectedWallpaper === preset.value;
                return (
                  <button
                    key={preset.id}
                    id={`wallpaper-preset-${preset.id}`}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2.5 rounded-2xl border text-left transition-all relative flex flex-col gap-2 ${
                      isSelected
                        ? 'border-teal-400 bg-neutral-800/80 ring-1 ring-teal-400'
                        : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 hover:bg-neutral-800/40'
                    }`}
                  >
                    <div
                      className="w-full h-12 rounded-xl border border-neutral-700/60 shadow-sm"
                      style={{ background: preset.preview }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white truncate">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Photo / Gallery Upload */}
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                  Custom Photo Wallpaper
                </h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Choose an image from device media or photos
                </p>
              </div>

              {!hasMediaPermission && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Permission Required
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label
                id="select-custom-wallpaper-btn"
                className="flex-1 py-2.5 px-4 rounded-xl border border-dashed border-teal-500/40 hover:border-teal-400 bg-teal-500/5 hover:bg-teal-500/10 text-teal-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                onClick={(e) => {
                  if (!hasMediaPermission) {
                    e.preventDefault();
                    onRequestMediaPermission();
                  }
                }}
              >
                <Upload className="w-4 h-4" />
                Select Photo from Gallery
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>

              {customImageUrl && (
                <button
                  onClick={handleResetDefault}
                  title="Remove custom photo"
                  className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-red-400 transition-colors border border-neutral-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Opacity & Dimming Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                Wallpaper Dimming / Intensity
              </span>
              <span className="font-mono text-teal-400">{opacity}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />
            <p className="text-[10px] text-neutral-500">
              Lower intensity helps chat message bubbles stand out with higher contrast.
            </p>
          </div>

          {/* Apply To All Toggle */}
          <label className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-700 text-teal-500 focus:ring-teal-400 accent-teal-500"
            />
            <div className="text-xs">
              <p className="font-medium text-white">Apply to all chats</p>
              <p className="text-neutral-400 text-[11px]">
                Set this wallpaper as the default background for all encrypted conversations.
              </p>
            </div>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between gap-3">
          <button
            id="reset-wallpaper-btn"
            onClick={handleResetDefault}
            className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs font-medium transition-colors"
          >
            Reset Default
          </button>
          <div className="flex items-center gap-2">
            <button
              id="cancel-wallpaper-btn"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              id="save-wallpaper-btn"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Check className="w-4 h-4 text-black" />
              Apply Wallpaper
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
