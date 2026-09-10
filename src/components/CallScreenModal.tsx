/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  SwitchCamera,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Activity,
  Key,
  Radio,
  Minimize2,
  Maximize2,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { ActiveCallSession } from '../types';
import { callManager } from '../services/callManager';

interface CallScreenModalProps {
  session: ActiveCallSession | null;
  onMinimize?: () => void;
}

export const CallScreenModal: React.FC<CallScreenModalProps> = ({ session, onMinimize }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [showSecurityDrawer, setShowSecurityDrawer] = useState(false);
  const [isCopiedSAS, setIsCopiedSAS] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Subscribe to local and remote media streams
  useEffect(() => {
    const unsubLocal = callManager.subscribeLocalStream((stream) => {
      setLocalStream(stream);
      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
      }
    });

    const unsubRemote = callManager.subscribeRemoteStream((stream) => {
      setRemoteStream(stream);
      if (remoteVideoRef.current && stream) {
        remoteVideoRef.current.srcObject = stream;
      }
    });

    return () => {
      unsubLocal();
      unsubRemote();
    };
  }, []);

  // Update video element sources when streams update
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, session?.isCameraOff]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, session?.status]);

  if (!session || session.status === 'idle') return null;

  const isVideo = session.type === 'video';
  const isConnected = session.status === 'connected';
  const isCalling = session.status === 'calling';
  const isConnecting = session.status === 'connecting';
  const isIncoming = session.status === 'incoming';

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleCopySAS = () => {
    if (!session.encryptionInfo.sasCodeWords) return;
    navigator.clipboard?.writeText(session.encryptionInfo.sasCodeWords);
    setIsCopiedSAS(true);
    setTimeout(() => setIsCopiedSAS(false), 2000);
  };

  return (
    <div
      id="webrtc-call-screen-overlay"
      className="absolute inset-0 z-50 bg-neutral-950 flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200"
    >
      {/* Background for Video or Dark Neutral for Voice */}
      {isVideo && isConnected ? (
        <div className="absolute inset-0 z-0 bg-black">
          {/* Remote Video Stream */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Local Camera Picture-in-Picture (PiP) */}
          <div className="absolute top-16 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-teal-500/60 shadow-2xl bg-neutral-900 z-20">
            {!session.isCameraOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-neutral-500">
                <VideoOff className="w-6 h-6 mb-1 text-neutral-600" />
                <span className="text-[10px]">Camera off</span>
              </div>
            )}
            <div className="absolute bottom-1 left-2 text-[9px] font-mono text-teal-300 bg-black/60 px-1.5 py-0.5 rounded">
              You
            </div>
          </div>
        </div>
      ) : (
        /* Subtle dynamic audio wave background for voice calls */
        <div className="absolute inset-0 z-0 pointer-events-none opacity-25">
          <div className="absolute inset-0 bg-radial from-teal-900/30 via-transparent to-neutral-950" />
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl animate-pulse" />
        </div>
      )}

      {/* Top Header Bar */}
      <div className="relative z-10 px-4 pt-10 pb-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Minimize to PiP */}
        <button
          type="button"
          onClick={onMinimize}
          className="w-9 h-9 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 flex items-center justify-center backdrop-blur-sm border border-neutral-700/50 transition-colors"
          title="Minimize call"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        {/* Security / Encryption Status Chip */}
        <button
          type="button"
          onClick={() => setShowSecurityDrawer(!showSecurityDrawer)}
          className={`px-3 py-1 rounded-full text-xs flex items-center gap-1.5 backdrop-blur-md border transition-all ${
            session.encryptionInfo.isVerifiedSAS
              ? 'bg-teal-950/80 border-teal-500/60 text-teal-300'
              : 'bg-neutral-900/80 border-neutral-700/60 text-neutral-300 hover:border-teal-500/40'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-teal-400" />
          <span className="font-medium">DTLS-SRTP 256-bit</span>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
        </button>

        {/* Technical info toggle */}
        <button
          type="button"
          onClick={() => setShowSecurityDrawer(!showSecurityDrawer)}
          className="w-9 h-9 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 flex items-center justify-center backdrop-blur-sm border border-neutral-700/50 transition-colors"
          title="Signaling & DTLS Details"
        >
          <Activity className="w-4 h-4 text-teal-400" />
        </button>
      </div>

      {/* Middle Caller Identity & Audio Visualizer */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        {(!isVideo || !isConnected) && (
          <>
            {/* Caller Avatar with Animated Rings */}
            <div className="relative mb-6">
              {isConnected && (
                <div className="absolute -inset-4 rounded-full border border-teal-500/30 animate-ping opacity-60 pointer-events-none" />
              )}
              {isCalling && (
                <div className="absolute -inset-3 rounded-full border border-teal-400/40 animate-pulse pointer-events-none" />
              )}
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-teal-500/60 shadow-2xl relative bg-neutral-900">
                <img
                  src={session.contact.avatar}
                  alt={session.contact.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Encryption badge */}
              <div
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-teal-600 border-2 border-neutral-950 flex items-center justify-center text-white shadow-lg"
                title="End-to-End Encrypted Peer"
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            {/* Caller Details */}
            <h2 className="text-xl font-bold text-white tracking-wide">
              {session.contact.name}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5 font-mono">
              {session.contact.handle}
            </p>

            {/* Call State & Live Timer */}
            <div className="mt-3">
              {isCalling && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 text-xs text-teal-300 border border-teal-500/30">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                  Ringing peer device...
                </span>
              )}
              {isConnecting && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 text-xs text-amber-300 border border-amber-500/40">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-spin" />
                  DTLS-SRTP Key Handshake...
                </span>
              )}
              {isConnected && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg font-mono font-semibold text-teal-300 tracking-wider">
                    {formatDuration(session.durationSeconds)}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    End-to-End Encrypted {session.type === 'video' ? 'Video' : 'Voice'} Call
                  </span>
                </div>
              )}
              {session.status === 'ended' && (
                <span className="text-sm text-neutral-400">Call Ended</span>
              )}
            </div>

            {/* Short Authentication String (SAS) Out-of-Band Audio Verification */}
            {isConnected && (
              <div className="mt-6 w-full max-w-xs bg-neutral-900/90 border border-neutral-800 p-3.5 rounded-2xl shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-teal-400" />
                    Audio Safety Words (SAS)
                  </span>
                  <span className="font-mono text-[10px] text-neutral-500">
                    MitM Guard
                  </span>
                </div>

                <div
                  onClick={handleCopySAS}
                  className="cursor-pointer hover:bg-neutral-800/80 p-2 rounded-xl border border-neutral-800 flex items-center justify-between transition-colors"
                >
                  <span className="text-sm font-mono font-bold text-teal-300 tracking-wider">
                    {session.encryptionInfo.sasCodeWords}
                  </span>
                  {isCopiedSAS ? (
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-neutral-500">Tap</span>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <p className="text-[10px] text-neutral-400 text-left leading-snug max-w-[190px]">
                    Compare these words aloud with {session.contact.name.split(' ')[0]} to verify encryption.
                  </p>
                  <button
                    type="button"
                    onClick={() => callManager.verifySAS()}
                    disabled={session.encryptionInfo.isVerifiedSAS}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      session.encryptionInfo.isVerifiedSAS
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                    }`}
                  >
                    {session.encryptionInfo.isVerifiedSAS ? 'Verified ✓' : 'Mark Match'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Video Mode Connected Overlay Status (Floating at Top) */}
        {isVideo && isConnected && (
          <div className="absolute top-16 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-left z-20">
            <h3 className="text-xs font-semibold text-white">{session.contact.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-mono text-teal-300">
                {formatDuration(session.durationSeconds)}
              </span>
              <span className="text-neutral-500">•</span>
              <span className="text-[10px] text-neutral-300 font-mono">
                {session.encryptionInfo.sasCodeWords.split(' - ')[0]}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Call Controls (Material 3 Call Palette) */}
      <div className="relative z-10 px-6 pb-12 pt-4 bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          {/* Mute Microphone Toggle */}
          <button
            type="button"
            onClick={() => callManager.toggleMute()}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
              session.isMuted
                ? 'bg-amber-500/20 text-amber-300 border-2 border-amber-500/60'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700'
            }`}
            title={session.isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {session.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Toggle Camera / Video */}
          {isVideo && (
            <button
              type="button"
              onClick={() => callManager.toggleCamera()}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                session.isCameraOff
                  ? 'bg-amber-500/20 text-amber-300 border-2 border-amber-500/60'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700'
              }`}
              title={session.isCameraOff ? 'Turn camera on' : 'Turn camera off'}
            >
              {session.isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
          )}

          {/* Flip Camera Facing Mode (Front/Back) */}
          {isVideo && (
            <button
              type="button"
              onClick={() => callManager.switchCameraFacing()}
              className="w-14 h-14 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 flex items-center justify-center transition-all shadow-lg"
              title="Flip camera"
            >
              <SwitchCamera className="w-6 h-6" />
            </button>
          )}

          {/* Speakerphone Toggle */}
          <button
            type="button"
            onClick={() => callManager.toggleSpeaker()}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
              session.isSpeakerOn
                ? 'bg-teal-500/20 text-teal-300 border-2 border-teal-500/60'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
            }`}
            title={session.isSpeakerOn ? 'Speakerphone on' : 'Earpiece mode'}
          >
            {session.isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>

          {/* End Call Button (Primary Destructive Action) */}
          <button
            id="end-call-btn"
            type="button"
            onClick={() => callManager.endCall()}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transition-transform active:scale-95 border border-red-400"
            title="End call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      </div>

      {/* Slide-Up DTLS-SRTP & Signaling Telemetry Drawer */}
      {showSecurityDrawer && (
        <div className="absolute inset-x-0 bottom-0 max-h-[70%] bg-neutral-900 border-t border-neutral-800 p-5 rounded-t-3xl shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              <h3 className="text-sm font-semibold text-white">
                WebRTC DTLS-SRTP Security Architecture
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowSecurityDrawer(false)}
              className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            {/* Cryptographic Parameters Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block">SRTP Media Cipher</span>
                <span className="font-mono text-teal-300 font-semibold">
                  {session.encryptionInfo.srtpCipher}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block">Key Exchange Handshake</span>
                <span className="font-mono text-neutral-200 font-semibold">
                  DTLS 1.3 (RFC 9147)
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block">Audio Codec</span>
                <span className="font-mono text-neutral-200">
                  {session.encryptionInfo.audioCodec}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block">Round-Trip Latency</span>
                <span className="font-mono text-teal-400">
                  {session.encryptionInfo.latencyMs} ms (0.0% loss)
                </span>
              </div>
            </div>

            {/* DTLS Certificate Fingerprint */}
            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block mb-1">
                Peer DTLS Certificate Fingerprint
              </span>
              <span className="font-mono text-[11px] text-neutral-300 break-all select-all">
                {session.encryptionInfo.dtlsFingerprint}
              </span>
            </div>

            {/* Signaling Server Logs */}
            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block mb-2 font-medium">
                Signaling Server Audit Events (wss://api.cipherdroid.internal/ws/signaling)
              </span>
              <div className="space-y-1.5 font-mono text-[11px]">
                {session.signalingLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <span className="text-teal-400 shrink-0">
                      [{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                    </span>
                    <span className="text-amber-400 shrink-0 font-bold">
                      {log.type}:
                    </span>
                    <span className="text-neutral-300">{log.summary}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
