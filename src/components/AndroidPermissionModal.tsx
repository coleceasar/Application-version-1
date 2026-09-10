/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, Mic, MapPin, Shield, Image, Users } from 'lucide-react';
import { permissionManager } from '../services/permissionManager';

export type PermissionPromptType = 'camera' | 'microphone' | 'location' | 'media' | 'contacts' | 'all';

interface AndroidPermissionModalProps {
  isOpen: boolean;
  type: PermissionPromptType;
  onClose: (granted: boolean) => void;
}

export const AndroidPermissionModal: React.FC<AndroidPermissionModalProps> = ({
  isOpen,
  type,
  onClose,
}) => {
  if (!isOpen) return null;

  const getDetails = () => {
    switch (type) {
      case 'camera':
        return {
          icon: <Camera className="w-8 h-8 text-teal-400" />,
          title: "Allow CipherDroid to take pictures and record video?",
          description: "Required for end-to-end encrypted WebRTC video calls, QR contact scanning, and encrypted camera attachments.",
        };
      case 'microphone':
        return {
          icon: <Mic className="w-8 h-8 text-teal-400" />,
          title: "Allow CipherDroid to record audio?",
          description: "Required for DTLS-SRTP 256-bit encrypted voice and video calls.",
        };
      case 'location':
        return {
          icon: <MapPin className="w-8 h-8 text-teal-400" />,
          title: "Allow CipherDroid to access this device's precise location?",
          description: "Required for real-time live location sharing in encrypted chats. Location coordinates are protected with AES-256-GCM.",
        };
      case 'media':
        return {
          icon: <Image className="w-8 h-8 text-teal-400" />,
          title: "Allow CipherDroid to access photos and media on this device?",
          description: "Required to pick custom chat wallpapers, attach encrypted photos and videos, and export chat transcripts safely.",
        };
      case 'contacts':
        return {
          icon: <Users className="w-8 h-8 text-teal-400" />,
          title: "Allow CipherDroid to access your contacts?",
          description: "Required to discover which contacts have CipherDroid installed on their phones. Encrypted messaging is only permitted with peers who have CipherDroid installed.",
        };
      case 'all':
      default:
        return {
          icon: <Shield className="w-8 h-8 text-teal-400" />,
          title: "Allow CipherDroid to access Camera, Microphone, and Device Sensors?",
          description: "CipherDroid requires these permissions to enable E2EE video calls, voice calling, and secure real-time communication.",
        };
    }
  };

  const { icon, title, description } = getDetails();

  const handleGrant = async () => {
    if (type === 'camera') {
      const ok = await permissionManager.requestCamera();
      onClose(ok);
    } else if (type === 'microphone') {
      const ok = await permissionManager.requestMicrophone();
      onClose(ok);
    } else if (type === 'location') {
      const pos = await permissionManager.requestLocation();
      onClose(!!pos || permissionManager.getStatus().location === 'granted');
    } else if (type === 'media') {
      const ok = await permissionManager.requestMedia();
      onClose(ok);
    } else if (type === 'contacts') {
      const ok = await permissionManager.requestContacts();
      onClose(ok);
    } else {
      const res = await permissionManager.requestAll();
      onClose(res.camera && res.microphone && res.location);
    }
  };

  const handleDeny = () => {
    onClose(false);
  };

  return (
    <div
      id="android-permission-dialog-overlay"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in"
    >
      <div
        id="android-permission-card"
        className="w-full sm:max-w-md bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-200"
      >
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
            {icon}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white px-2 leading-snug">
            {title}
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
            {description}
          </p>
        </div>

        {/* Android Material 3 permission actions */}
        <div className="space-y-2 pt-2">
          <button
            id="perm-while-using-app-btn"
            type="button"
            onClick={handleGrant}
            className="w-full py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm transition-all shadow-md active:scale-98 text-center"
          >
            While using the app
          </button>

          <button
            id="perm-only-this-time-btn"
            type="button"
            onClick={handleGrant}
            className="w-full py-3 px-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-sm transition-all active:scale-98 text-center"
          >
            Only this time
          </button>

          <button
            id="perm-dont-allow-btn"
            type="button"
            onClick={handleDeny}
            className="w-full py-3 px-4 rounded-2xl bg-transparent hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 font-medium text-sm transition-all active:scale-98 text-center"
          >
            Don't allow
          </button>
        </div>
      </div>
    </div>
  );
};
