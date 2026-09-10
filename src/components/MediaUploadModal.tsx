/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Image, Video, ShieldCheck, Flame, Upload, FileCheck, Film } from 'lucide-react';
import { MediaType } from '../types';

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMedia: (params: {
    mediaType: MediaType;
    mediaUrl: string;
    caption: string;
    ephemeralSeconds: number;
    isViewOnce?: boolean;
  }) => void;
}

const PRESET_MEDIA = [
  {
    title: 'Penetration Test Report (PNG)',
    type: 'image' as MediaType,
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    caption: 'Classified E2EE penetration audit report. AES-GCM tags authenticated.',
  },
  {
    title: 'Architecture Topology (WebP)',
    type: 'image' as MediaType,
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
    caption: 'Android Keystore StrongBox hardware boundary schematics.',
  },
  {
    title: 'Secure H.264 Video Stream',
    type: 'video' as MediaType,
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    caption: 'Encrypted H.264 video payload via Tink streaming AEAD.',
  },
];

export const MediaUploadModal: React.FC<MediaUploadModalProps> = ({
  isOpen,
  onClose,
  onSendMedia,
}) => {
  const [selectedType, setSelectedType] = useState<MediaType>('image');
  const [selectedUrl, setSelectedUrl] = useState<string>(PRESET_MEDIA[0].url);
  const [caption, setCaption] = useState<string>(PRESET_MEDIA[0].caption);
  const [ephemeralSeconds, setEphemeralSeconds] = useState<number>(0);
  const [isViewOnce, setIsViewOnce] = useState<boolean>(false);
  const [customFileLoaded, setCustomFileLoaded] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video');
    setSelectedType(isVideo ? 'video' : 'image');

    const objectUrl = URL.createObjectURL(file);
    setSelectedUrl(objectUrl);
    setCaption(`Encrypted ${isVideo ? 'H.264 video' : 'image'} (${file.name})`);
    setCustomFileLoaded(true);
  };

  const handleSelectPreset = (preset: typeof PRESET_MEDIA[0]) => {
    setSelectedType(preset.type);
    setSelectedUrl(preset.url);
    setCaption(preset.caption);
    setCustomFileLoaded(false);
  };

  const handleSend = () => {
    onSendMedia({
      mediaType: selectedType,
      mediaUrl: selectedUrl,
      caption: caption.trim(),
      ephemeralSeconds: ephemeralSeconds,
      isViewOnce: isViewOnce,
    });
    onClose();
  };

  return (
    <div
      id="media-upload-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150"
    >
      <div
        id="media-upload-card"
        className="w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-800 text-neutral-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Encrypt & Send Media</h3>
              <p className="text-[11px] text-neutral-400">
                AES-256-GCM encrypted before transmission
              </p>
            </div>
          </div>
          <button
            id="close-media-modal-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Preset Selector */}
          <div>
            <label className="text-neutral-400 font-medium mb-1.5 block">Select Pre-encrypted Asset</label>
            <div className="space-y-2">
              {PRESET_MEDIA.map((preset, idx) => (
                <button
                  key={idx}
                  id={`preset-media-btn-${idx}`}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                    !customFileLoaded && selectedUrl === preset.url
                      ? 'bg-teal-500/10 border-teal-500/40 text-teal-200 shadow-sm'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {preset.type === 'video' ? (
                      <Film className="w-4 h-4 text-teal-400" />
                    ) : (
                      <Image className="w-4 h-4 text-teal-400" />
                    )}
                    <div>
                      <p className="font-medium text-neutral-200">{preset.title}</p>
                      <p className="text-[10px] text-neutral-400 truncate max-w-[220px]">
                        {preset.caption}
                      </p>
                    </div>
                  </div>
                  {!customFileLoaded && selectedUrl === preset.url && (
                    <FileCheck className="w-4 h-4 text-teal-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Or Upload Custom File */}
          <div>
            <label className="text-neutral-400 font-medium mb-1.5 block">Or Upload Local Device File</label>
            <label className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/40 hover:bg-neutral-800/40 cursor-pointer transition-colors text-neutral-300">
              <Upload className="w-4 h-4 text-teal-400" />
              <span className="text-xs">Browse JPG, PNG, WebP or MP4</span>
              <input
                id="file-input-media"
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Media Preview Box */}
          <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-black aspect-video flex items-center justify-center relative">
            {selectedType === 'video' ? (
              <video
                src={selectedUrl}
                controls
                className="w-full h-full object-cover"
                playsInline
              />
            ) : (
              <img
                src={selectedUrl}
                alt="Selected encrypted preview"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] text-teal-400 flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3 h-3" />
              <span>Streaming AEAD Encrypted</span>
            </div>
          </div>

          {/* Caption Input */}
          <div>
            <label className="text-neutral-400 font-medium mb-1 block">Caption / Notes</label>
            <input
              id="media-caption-input"
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add encrypted caption..."
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-teal-500 text-xs"
            />
          </div>

          {/* View Once Toggle */}
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono font-bold text-xs transition-colors ${
                isViewOnce
                  ? 'bg-teal-500/20 border-teal-500/60 text-teal-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400'
              }`}>
                1
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-200">View-Once Media</p>
                <p className="text-[11px] text-neutral-400">Can only be opened once; self-destructs upon closing</p>
              </div>
            </div>
            <button
              type="button"
              id="view-once-toggle-btn"
              onClick={() => setIsViewOnce(!isViewOnce)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                isViewOnce ? 'bg-teal-500' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  isViewOnce ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Ephemeral Timer Selector */}
          <div>
            <label className="text-neutral-400 font-medium mb-1.5 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Self-Destruct Ephemeral Timer</span>
            </label>
            <div className="grid grid-cols-5 gap-1 text-center font-mono">
              {[
                { sec: 0, label: 'Off' },
                { sec: 10, label: '10s' },
                { sec: 30, label: '30s' },
                { sec: 60, label: '1m' },
                { sec: 3600, label: '1h' },
              ].map((item) => (
                <button
                  key={item.sec}
                  type="button"
                  id={`ephemeral-timer-btn-${item.sec}`}
                  onClick={() => setEphemeralSeconds(item.sec)}
                  className={`py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    ephemeralSeconds === item.sec
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/90 flex justify-between items-center">
          <span className="text-[11px] text-neutral-400">
            {ephemeralSeconds > 0 ? `Burns ${ephemeralSeconds}s after read` : 'Stored until deleted'}
          </span>
          <div className="flex gap-2">
            <button
              id="cancel-media-btn"
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              id="send-media-btn"
              type="button"
              onClick={handleSend}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Encrypt & Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
