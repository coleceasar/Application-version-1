/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Camera,
  X,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Share2,
  Upload,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { Contact } from '../types';
import { formatSafetyNumber } from '../services/cryptoEngine';

interface QRContactScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddContact: (contact: Contact) => void;
  hasCameraPermission: boolean;
  onRequestCameraPermission: () => void;
  hasMediaPermission: boolean;
  onRequestMediaPermission: () => void;
}

const SIMULATED_PEER_QR_CODES = [
  {
    name: 'Sgt. Rachel Torres',
    handle: '@rachel.torres',
    phone: '+1 (555) 918-2041',
    role: 'Quantum Resistance Analyst',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    safetyNumber: '73910-44912-00192-83910-18294-91028',
    publicKey: '5D12-99AB-44FE-3810',
    model: 'Google Pixel 8 Pro',
  },
  {
    name: 'Viktor Reznov',
    handle: '@reznov.crypto',
    phone: '+44 7700 900123',
    role: 'Hardware Security Module Eng.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    safetyNumber: '19284-91028-44912-73910-00192-38104',
    publicKey: '9A02-FE38-1099-AB44',
    model: 'Samsung Galaxy S24 Ultra',
  },
];

export const QRContactScanModal: React.FC<QRContactScanModalProps> = ({
  isOpen,
  onClose,
  onAddContact,
  hasCameraPermission,
  onRequestCameraPermission,
  hasMediaPermission,
  onRequestMediaPermission,
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'my_code'>('scan');
  const [myQrDataUrl, setMyQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detectedPeer, setDetectedPeer] = useState<any | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Generate User's own QR Code
  useEffect(() => {
    if (!isOpen) return;

    const myIdentityUrl = `cipherdroid://contact?id=operator_self&name=Current%20Operator&handle=@operator.cipher&safety=48192-30194-82910-44910-18294-00192&pubkey=A9C1-F820-E419-77B2&app=cipherdroid_v2.4`;

    QRCode.toDataURL(myIdentityUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setMyQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [isOpen]);

  // Camera stream lifecycle for scanning
  useEffect(() => {
    if (!isOpen || activeTab !== 'scan') {
      stopCamera();
      return;
    }

    if (hasCameraPermission) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, hasCameraPermission]);

  const startCamera = async () => {
    setCameraError(null);
    setScanning(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn('Camera stream error in sandbox:', err);
      // Still allow simulated scanning
      setCameraError(
        'Physical camera stream unavailable in this container iframe. You can use the Quick Scan button below to scan simulated CipherDroid peers.'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const handleSimulateScan = (peerIndex = 0) => {
    const peer = SIMULATED_PEER_QR_CODES[peerIndex % SIMULATED_PEER_QR_CODES.length];
    setDetectedPeer(peer);
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasMediaPermission) {
      onRequestMediaPermission();
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      // Simulate reading QR code from uploaded image
      handleSimulateScan(0);
    }
  };

  const handleConfirmAddContact = () => {
    if (!detectedPeer) return;

    const newContact: Contact = {
      id: `contact_qr_${Date.now()}`,
      name: detectedPeer.name,
      handle: detectedPeer.handle,
      avatar: detectedPeer.avatar,
      role: detectedPeer.role,
      statusText: 'Verified via QR Code • P-256 ECDH',
      isOnline: true,
      lastSeen: 'Active now',
      isVerified: true,
      safetyNumber: formatSafetyNumber(detectedPeer.safetyNumber),
      publicKeyFingerprint: detectedPeer.publicKey,
      deviceInfo: {
        model: detectedPeer.model,
        androidVersion: 'API 34 (UpsideDownCake)',
        keystoreLevel: 'Hardware TEE / StrongBox',
      },
      unreadCount: 0,
      phone: detectedPeer.phone,
      hasCipherDroid: true, // Peer is verified to have CipherDroid installed
    };

    onAddContact(newContact);
    onClose();
  };

  const handleCopyMyCodeLink = () => {
    const link = `https://cipherdroid.app/contact?ref=operator_self&safety=48192-30194-82910-44910-18294-00192`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      id="qr-contact-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in"
    >
      <div
        id="qr-contact-card"
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                CipherDroid QR
                <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  E2EE Peer
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Scan or share hardware-verified identity codes
              </p>
            </div>
          </div>
          <button
            id="close-qr-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="p-2 bg-neutral-950/80 border-b border-neutral-800 grid grid-cols-2 gap-1 text-xs">
          <button
            id="tab-qr-scan"
            onClick={() => setActiveTab('scan')}
            className={`py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'scan'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            Scan QR Code
          </button>
          <button
            id="tab-qr-my-code"
            onClick={() => setActiveTab('my_code')}
            className={`py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'my_code'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            My Identity QR
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'scan' ? (
            <div className="space-y-4">
              {/* Camera view finder */}
              <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-3xl overflow-hidden bg-black border-2 border-neutral-800 flex items-center justify-center shadow-inner">
                {/* Live video */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Simulated scanner visual if camera is idle or not allowed */}
                <div className="absolute inset-0 bg-neutral-950/40 pointer-events-none flex items-center justify-center">
                  {/* Scanner reticle box */}
                  <div className="relative w-48 h-48 border-2 border-teal-400/80 rounded-2xl">
                    {/* Reticle corner accents */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-teal-300"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-teal-300"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-teal-300"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-teal-300"></div>

                    {/* Laser scanning line */}
                    <div className="absolute left-0 right-0 h-0.5 bg-teal-400 shadow-[0_0_12px_#2dd4bf] animate-[bounce_2s_infinite]"></div>
                  </div>
                </div>

                {!hasCameraPermission && (
                  <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center space-y-3 z-10">
                    <Camera className="w-8 h-8 text-neutral-400" />
                    <p className="text-xs text-neutral-300">
                      Camera permission needed to scan peer QR codes
                    </p>
                    <button
                      id="enable-camera-qr-btn"
                      onClick={onRequestCameraPermission}
                      className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-semibold"
                    >
                      Enable Camera
                    </button>
                  </div>
                )}
              </div>

              {cameraError && (
                <p className="text-[11px] text-neutral-400 text-center leading-relaxed px-4">
                  {cameraError}
                </p>
              )}

              {/* Detected Peer Card */}
              {detectedPeer ? (
                <div
                  id="detected-peer-card"
                  className="p-4 rounded-2xl bg-teal-950/40 border border-teal-500/40 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={detectedPeer.avatar}
                      alt={detectedPeer.name}
                      className="w-12 h-12 rounded-full object-cover border border-teal-500/50"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white truncate">
                          {detectedPeer.name}
                        </h4>
                        <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                      </div>
                      <p className="text-xs text-neutral-400 truncate">
                        {detectedPeer.handle} • {detectedPeer.role}
                      </p>
                      <p className="text-[10px] text-teal-400 font-mono mt-0.5">
                        Key: {detectedPeer.publicKey}
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-xl text-[11px] font-mono text-neutral-300 flex items-center justify-between">
                    <span className="text-neutral-500">Safety Number:</span>
                    <span className="text-teal-300">{detectedPeer.safetyNumber.substring(0, 17)}...</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      id="confirm-add-scanned-contact"
                      onClick={handleConfirmAddContact}
                      className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <UserCheck className="w-4 h-4" />
                      Add Contact & Start Encrypted Chat
                    </button>
                    <button
                      id="scan-another-qr-btn"
                      onClick={() => setDetectedPeer(null)}
                      className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium"
                    >
                      Rescan
                    </button>
                  </div>
                </div>
              ) : (
                /* Scanning Action Shortcuts */
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-neutral-400 text-center font-medium">
                    Quick test simulated QR scan:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="simulate-scan-peer-1"
                      onClick={() => handleSimulateScan(0)}
                      className="p-2.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-left transition-colors"
                    >
                      <p className="text-xs font-semibold text-white truncate">
                        Scan Torres (QR)
                      </p>
                      <p className="text-[10px] text-teal-400 font-mono">
                        Hardware TEE Peer
                      </p>
                    </button>
                    <button
                      id="simulate-scan-peer-2"
                      onClick={() => handleSimulateScan(1)}
                      className="p-2.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-left transition-colors"
                    >
                      <p className="text-xs font-semibold text-white truncate">
                        Scan Reznov (QR)
                      </p>
                      <p className="text-[10px] text-teal-400 font-mono">
                        StrongBox Active
                      </p>
                    </button>
                  </div>

                  {/* Upload QR image with media permission check */}
                  <label className="w-full py-2.5 rounded-xl border border-dashed border-neutral-700 hover:border-teal-500/50 bg-neutral-950/40 text-neutral-400 hover:text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors mt-2">
                    <Upload className="w-4 h-4 text-teal-400" />
                    Upload QR Image from Gallery
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadImage}
                    />
                  </label>
                </div>
              )}
            </div>
          ) : (
            /* My Identity QR Code Tab */
            <div className="space-y-4 text-center">
              <div className="p-4 bg-white rounded-3xl w-fit mx-auto shadow-xl border-4 border-teal-500/30">
                {myQrDataUrl ? (
                  <img
                    src={myQrDataUrl}
                    alt="CipherDroid Contact QR Code"
                    className="w-52 h-52 object-contain"
                  />
                ) : (
                  <div className="w-52 h-52 bg-neutral-100 flex items-center justify-center text-neutral-500 text-xs">
                    Generating QR code...
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  Current Operator
                </h3>
                <p className="text-xs text-teal-400 font-mono">
                  @operator.cipher • Android 14 StrongBox
                </p>
              </div>

              {/* Safety Number Display */}
              <div className="p-3 bg-neutral-950/90 rounded-2xl border border-neutral-800 text-left space-y-1">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                  Identity Safety Number Fingerprint
                </p>
                <p className="text-xs font-mono text-neutral-300 break-all leading-relaxed">
                  48192 30194 82910 44910 18294 00192
                </p>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  id="copy-my-qr-link-btn"
                  onClick={handleCopyMyCodeLink}
                  className="py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors border border-neutral-700"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-teal-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-neutral-400" />
                      Copy Link
                    </>
                  )}
                </button>
                <button
                  id="share-my-qr-btn"
                  onClick={handleCopyMyCodeLink}
                  className="py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Share2 className="w-4 h-4 text-black" />
                  Share Identity
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info banner */}
        <div className="p-3 bg-neutral-950/90 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            Zero-Knowledge Public Key Exchange
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            P-256 ECDH
          </span>
        </div>
      </div>
    </div>
  );
};
