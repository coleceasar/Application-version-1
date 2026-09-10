/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Contact, CallType, CallStatus, ActiveCallSession, CallEncryptionInfo, SignalingEvent } from '../types';
import { networkService } from './networkManager';

type SessionListener = (session: ActiveCallSession | null) => void;
type StreamListener = (stream: MediaStream | null) => void;

// Wordlist for deriving human-friendly Short Authentication Strings (SAS)
const SAS_WORDLIST = [
  'atlas', 'beacon', 'cobalt', 'delta', 'echo', 'falcon', 'garnet', 'horizon',
  'iris', 'jupiter', 'krypton', 'lumen', 'matrix', 'nebula', 'orbit', 'prism',
  'quantum', 'radar', 'solaris', 'titan', 'umbra', 'vortex', 'zenith', 'pulsar'
];

function generateSASFromFingerprint(fp: string): { words: string; hex: string } {
  let hash = 0;
  for (let i = 0; i < fp.length; i++) {
    hash = ((hash << 5) - hash) + fp.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  const w1 = SAS_WORDLIST[abs % SAS_WORDLIST.length];
  const w2 = SAS_WORDLIST[(abs >> 4) % SAS_WORDLIST.length];
  const w3 = SAS_WORDLIST[(abs >> 8) % SAS_WORDLIST.length];
  const hex = (abs & 0xffffffff).toString(16).padStart(8, '0').toUpperCase();
  return {
    words: `${w1} - ${w2} - ${w3}`,
    hex,
  };
}

class CallManager {
  private currentSession: ActiveCallSession | null = null;
  private sessionListeners: Set<SessionListener> = new Set();
  private localStreamListeners: Set<StreamListener> = new Set();
  private remoteStreamListeners: Set<StreamListener> = new Set();

  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;

  private durationTimer: any = null;
  private ringAudioContext: AudioContext | null = null;
  private ringOscillator: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;
  private isRingingPlaying: boolean = false;

  public subscribe(listener: SessionListener): () => void {
    this.sessionListeners.add(listener);
    listener(this.currentSession);
    return () => this.sessionListeners.delete(listener);
  }

  public subscribeLocalStream(listener: StreamListener): () => void {
    this.localStreamListeners.add(listener);
    listener(this.localStream);
    return () => this.localStreamListeners.delete(listener);
  }

  public subscribeRemoteStream(listener: StreamListener): () => void {
    this.remoteStreamListeners.add(listener);
    listener(this.remoteStream);
    return () => this.remoteStreamListeners.delete(listener);
  }

  private notify() {
    this.sessionListeners.forEach((l) => l(this.currentSession ? { ...this.currentSession } : null));
  }

  private notifyStreams() {
    this.localStreamListeners.forEach((l) => l(this.localStream));
    this.remoteStreamListeners.forEach((l) => l(this.remoteStream));
  }

  public getSession(): ActiveCallSession | null {
    return this.currentSession;
  }

  // Ringing sounds synthesizer via Web Audio API (graceful, works without external mp3s)
  private playRingTone(type: 'outgoing' | 'incoming') {
    try {
      if (this.isRingingPlaying) return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.ringAudioContext = new AudioContextClass();
      const ctx = this.ringAudioContext;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      this.ringGain = ctx.createGain();
      this.ringGain.gain.setValueAtTime(0.08, ctx.currentTime);
      this.ringGain.connect(ctx.destination);

      const freq1 = type === 'outgoing' ? 440 : 523.25; // A4 vs C5
      const freq2 = type === 'outgoing' ? 480 : 659.25; // B4 vs E5

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.frequency.setValueAtTime(freq1, ctx.currentTime);
      osc2.frequency.setValueAtTime(freq2, ctx.currentTime);

      osc1.connect(this.ringGain);
      osc2.connect(this.ringGain);

      // Periodic pulsing ring pattern: 1.5s on, 2.5s off
      const now = ctx.currentTime;
      for (let i = 0; i < 15; i++) {
        const start = now + i * 4;
        this.ringGain.gain.setValueAtTime(0.08, start);
        this.ringGain.gain.setValueAtTime(0, start + 1.6);
      }

      osc1.start();
      osc2.start();
      this.ringOscillator = osc1;
      this.isRingingPlaying = true;
    } catch (e) {
      console.warn('AudioContext ring sound warning:', e);
    }
  }

  private stopRingTone() {
    try {
      if (this.ringOscillator) {
        this.ringOscillator.stop();
        this.ringOscillator.disconnect();
        this.ringOscillator = null;
      }
      if (this.ringGain) {
        this.ringGain.disconnect();
        this.ringGain = null;
      }
      if (this.ringAudioContext) {
        this.ringAudioContext.close();
        this.ringAudioContext = null;
      }
      this.isRingingPlaying = false;
    } catch (e) {
      // Ignore
    }
  }

  // Create real or robust fallback media stream
  private async createOrGetMedia(type: CallType): Promise<MediaStream> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        return stream;
      }
    } catch (err) {
      console.info('Using synthetic WebRTC fallback stream (camera/mic permission denied or restricted):', err);
    }

    // Fallback: Generate real MediaStream using Canvas + Web Audio API
    return this.createSyntheticStream(type);
  }

  private createSyntheticStream(type: CallType): MediaStream {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const dest = audioCtx.createMediaStreamDestination();

    // Subtle audio carrier wave for real microphone track
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(dest);
    osc.start();

    const tracks: MediaStreamTrack[] = [...dest.stream.getAudioTracks()];

    if (type === 'video') {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      let frameCount = 0;
      const draw = () => {
        if (!ctx) return;
        frameCount++;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Animated gradient background
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#042f2e');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#022c22');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid lines
        ctx.strokeStyle = 'rgba(20, 184, 166, 0.15)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Camera user silhouette / avatar
        ctx.fillStyle = '#14b8a6';
        ctx.beginPath();
        const pulse = Math.sin(frameCount * 0.05) * 6;
        ctx.arc(canvas.width / 2, canvas.height / 2 - 30, 60 + pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f766e';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2 + 130, 100, Math.PI, 0);
        ctx.fill();

        // Watermark and crypto info
        ctx.fillStyle = '#5eead4';
        ctx.font = '16px monospace';
        ctx.fillText('WEBRTC E2EE CAMERA FEED (AES-256-GCM)', 24, 40);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px monospace';
        ctx.fillText(`FRAME #${frameCount} • VP9 1080p • DTLS-SRTP ACTIVE`, 24, 62);
      };

      const timer = setInterval(draw, 1000 / 30);
      const canvasStream = canvas.captureStream(30);
      const videoTrack = canvasStream.getVideoTracks()[0];
      if (videoTrack) {
        // Attach cleanup hook to stop canvas loop when track ends
        const origStop = videoTrack.stop.bind(videoTrack);
        videoTrack.stop = () => {
          clearInterval(timer);
          origStop();
        };
        tracks.push(videoTrack);
      }
    }

    return new MediaStream(tracks);
  }

  // Remote peer stream generator for realistic video call simulation
  private createRemotePeerStream(contact: Contact, type: CallType): MediaStream {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const dest = audioCtx.createMediaStreamDestination();

    // Voice frequency generator simulating remote speech
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.005, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(dest);
    osc.start();

    const tracks: MediaStreamTrack[] = [...dest.stream.getAudioTracks()];

    if (type === 'video') {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      const peerImg = new Image();
      peerImg.crossOrigin = 'anonymous';
      peerImg.src = contact.avatar;

      let tick = 0;
      const draw = () => {
        if (!ctx) return;
        tick++;
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Remote peer avatar
        try {
          if (peerImg.complete && peerImg.naturalWidth > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2 - 20, 110, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(peerImg, canvas.width / 2 - 110, canvas.height / 2 - 130, 220, 220);
            ctx.restore();
          }
        } catch (e) {
          // fallback
        }

        // Live peer audio waveform overlay
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const sliceWidth = canvas.width / 40;
        let x = 0;
        for (let i = 0; i < 40; i++) {
          const v = Math.sin(tick * 0.15 + i * 0.4) * 18;
          const y = canvas.height - 70 + v;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();

        // Overlay status
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`${contact.name} (Encrypted Feed)`, 24, canvas.height - 28);
        ctx.fillStyle = '#2dd4bf';
        ctx.font = '12px monospace';
        ctx.fillText('DTLS-SRTP 256-bit AES-GCM • 0.0% Loss', 24, canvas.height - 12);
      };

      const timer = setInterval(draw, 1000 / 30);
      const canvasStream = canvas.captureStream(30);
      const videoTrack = canvasStream.getVideoTracks()[0];
      if (videoTrack) {
        const origStop = videoTrack.stop.bind(videoTrack);
        videoTrack.stop = () => {
          clearInterval(timer);
          origStop();
        };
        tracks.push(videoTrack);
      }
    }

    return new MediaStream(tracks);
  }

  // Start an Outgoing Call
  public async startCall(contact: Contact, type: CallType) {
    if (this.currentSession && this.currentSession.status !== 'ended' && this.currentSession.status !== 'idle') {
      console.warn('Call already in progress');
      return;
    }

    const callId = 'call_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const dtlsFingerprint = `SHA-256 ${Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(':')}`;
    const sas = generateSASFromFingerprint(dtlsFingerprint + contact.id);

    const encryptionInfo: CallEncryptionInfo = {
      srtpCipher: 'AEAD_AES_256_GCM',
      dtlsFingerprint,
      sasCodeWords: sas.words,
      sasHex: sas.hex,
      audioCodec: 'Opus 48kHz / 32 kbps',
      videoCodec: type === 'video' ? 'VP9 1080p 30fps' : 'None',
      latencyMs: 34,
      packetLossPercent: 0.0,
      isVerifiedSAS: false,
    };

    const initialLogs: SignalingEvent[] = [
      {
        id: 'sig_1',
        timestamp: Date.now(),
        type: 'SDP_OFFER',
        direction: 'outgoing',
        summary: `Created WebRTC SDP Offer (m=${type}, DTLS-SRTP AES-256-GCM)`,
      },
    ];

    this.currentSession = {
      callId,
      contact,
      type,
      status: 'calling',
      durationSeconds: 0,
      isMuted: false,
      isCameraOff: false,
      isSpeakerOn: true,
      facingMode: 'user',
      encryptionInfo,
      signalingLogs: initialLogs,
    };

    this.notify();
    this.playRingTone('outgoing');

    // Get local media
    this.localStream = await this.createOrGetMedia(type);
    this.notifyStreams();

    networkService.addLog({
      protocol: 'WSS',
      methodOrEvent: 'SIGNALING: call_offer',
      endpoint: 'wss://api.cipherdroid.internal/ws/signaling',
      status: 'OK',
      latencyMs: 28,
      payloadSize: '1.4 KB',
      summary: `Dispatched encrypted SDP Offer for ${type} call to ${contact.name}.`,
      metadataMinimized: true,
    });

    // Simulate remote peer ringing & answering after ~2.8 seconds
    setTimeout(() => {
      if (!this.currentSession || this.currentSession.callId !== callId) return;

      this.stopRingTone();
      this.currentSession.status = 'connecting';
      this.currentSession.signalingLogs.push(
        {
          id: 'sig_2',
          timestamp: Date.now(),
          type: 'SDP_ANSWER',
          direction: 'incoming',
          summary: `Received SDP Answer from ${contact.name} with compatible DTLS fingerprint`,
        },
        {
          id: 'sig_3',
          timestamp: Date.now() + 120,
          type: 'ICE_CANDIDATE',
          direction: 'system',
          summary: 'Direct host-to-host ICE pair selected: 10.0.0.4:50004 <-> 10.0.0.9:50004',
        },
        {
          id: 'sig_4',
          timestamp: Date.now() + 240,
          type: 'DTLS_HANDSHAKE',
          direction: 'system',
          summary: 'DTLS 1.3 Handshake completed. Derived SRTP master keys via HKDF-SHA256',
        }
      );
      this.notify();

      setTimeout(() => {
        if (!this.currentSession || this.currentSession.callId !== callId) return;

        this.currentSession.status = 'connected';
        this.currentSession.startedAt = Date.now();
        this.currentSession.signalingLogs.push({
          id: 'sig_5',
          timestamp: Date.now(),
          type: 'MEDIA_FLOW',
          direction: 'system',
          summary: 'E2EE SRTP media streams active. AEAD_AES_256_GCM frame verification OK.',
        });

        // Setup remote peer stream
        this.remoteStream = this.createRemotePeerStream(contact, type);
        this.notifyStreams();
        this.notify();

        // Start call duration clock
        this.startTimer();

        networkService.addLog({
          protocol: 'WSS',
          methodOrEvent: 'SIGNALING: call_connected',
          endpoint: 'wss://api.cipherdroid.internal/ws/signaling',
          status: 'OK',
          latencyMs: 34,
          payloadSize: '2.1 KB',
          summary: `P2P WebRTC E2EE channel established with ${contact.name}.`,
          metadataMinimized: true,
        });
      }, 700);
    }, 2800);
  }

  // Simulate an Incoming Call from a Contact (great for testing incoming alerts)
  public simulateIncomingCall(contact: Contact, type: CallType) {
    if (this.currentSession && this.currentSession.status !== 'ended' && this.currentSession.status !== 'idle') {
      return;
    }

    const callId = 'call_inc_' + Date.now().toString(36);
    const dtlsFingerprint = `SHA-256 ${Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(':')}`;
    const sas = generateSASFromFingerprint(dtlsFingerprint + contact.id);

    this.currentSession = {
      callId,
      contact,
      type,
      status: 'incoming',
      durationSeconds: 0,
      isMuted: false,
      isCameraOff: false,
      isSpeakerOn: true,
      facingMode: 'user',
      encryptionInfo: {
        srtpCipher: 'AEAD_AES_256_GCM',
        dtlsFingerprint,
        sasCodeWords: sas.words,
        sasHex: sas.hex,
        audioCodec: 'Opus 48kHz / 32 kbps',
        videoCodec: type === 'video' ? 'VP9 1080p 30fps' : 'None',
        latencyMs: 31,
        packetLossPercent: 0.0,
        isVerifiedSAS: false,
      },
      signalingLogs: [
        {
          id: 'sig_inc_1',
          timestamp: Date.now(),
          type: 'SDP_OFFER',
          direction: 'incoming',
          summary: `Incoming encrypted ${type} call offer from ${contact.name}`,
        },
      ],
    };

    this.notify();
    this.playRingTone('incoming');

    networkService.addLog({
      protocol: 'WSS',
      methodOrEvent: 'SIGNALING: incoming_call',
      endpoint: 'wss://api.cipherdroid.internal/ws/signaling',
      status: 'OK',
      latencyMs: 31,
      payloadSize: '1.2 KB',
      summary: `Received incoming ${type} call notification from ${contact.name}.`,
      metadataMinimized: true,
    });
  }

  // Accept incoming call
  public async acceptCall() {
    if (!this.currentSession || this.currentSession.status !== 'incoming') return;
    this.stopRingTone();

    this.currentSession.status = 'connecting';
    this.currentSession.signalingLogs.push({
      id: 'sig_acc_1',
      timestamp: Date.now(),
      type: 'SDP_ANSWER',
      direction: 'outgoing',
      summary: 'Generated and transmitted SDP Answer with local DTLS certificate',
    });
    this.notify();

    // Acquire local media
    this.localStream = await this.createOrGetMedia(this.currentSession.type);
    this.notifyStreams();

    setTimeout(() => {
      if (!this.currentSession) return;
      this.currentSession.status = 'connected';
      this.currentSession.startedAt = Date.now();
      this.currentSession.signalingLogs.push({
        id: 'sig_acc_2',
        timestamp: Date.now(),
        type: 'MEDIA_FLOW',
        direction: 'system',
        summary: 'WebRTC P2P Call Connected. Media encrypted with SRTP AES-256-GCM.',
      });

      this.remoteStream = this.createRemotePeerStream(this.currentSession.contact, this.currentSession.type);
      this.notifyStreams();
      this.notify();
      this.startTimer();
    }, 600);
  }

  // Decline incoming call
  public declineCall() {
    this.stopRingTone();
    if (this.currentSession) {
      this.currentSession.status = 'ended';
      this.notify();
    }
    this.cleanup();
  }

  // End active call
  public endCall() {
    this.stopRingTone();
    if (this.currentSession) {
      this.currentSession.status = 'ended';
      this.currentSession.signalingLogs.push({
        id: 'sig_end',
        timestamp: Date.now(),
        type: 'CALL_TERMINATED',
        direction: 'system',
        summary: `Call terminated after ${this.currentSession.durationSeconds}s. Cryptographic keys zeroized.`,
      });
      this.notify();

      networkService.addLog({
        protocol: 'WSS',
        methodOrEvent: 'SIGNALING: call_bye',
        endpoint: 'wss://api.cipherdroid.internal/ws/signaling',
        status: 'OK',
        latencyMs: 25,
        payloadSize: '240 B',
        summary: `WebRTC session closed with ${this.currentSession.contact.name}. Keys purged.`,
        metadataMinimized: true,
      });
    }

    setTimeout(() => {
      this.cleanup();
    }, 800);
  }

  // Controls
  public toggleMute(): boolean {
    if (!this.currentSession) return false;
    const newMuted = !this.currentSession.isMuted;
    this.currentSession.isMuted = newMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
    }
    this.notify();
    return newMuted;
  }

  public toggleCamera(): boolean {
    if (!this.currentSession) return false;
    const newCameraOff = !this.currentSession.isCameraOff;
    this.currentSession.isCameraOff = newCameraOff;
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !newCameraOff;
      });
    }
    this.notify();
    return newCameraOff;
  }

  public toggleSpeaker(): boolean {
    if (!this.currentSession) return true;
    this.currentSession.isSpeakerOn = !this.currentSession.isSpeakerOn;
    this.notify();
    return this.currentSession.isSpeakerOn;
  }

  public switchCameraFacing(): 'user' | 'environment' {
    if (!this.currentSession) return 'user';
    const nextFacing = this.currentSession.facingMode === 'user' ? 'environment' : 'user';
    this.currentSession.facingMode = nextFacing;
    this.notify();
    return nextFacing;
  }

  public verifySAS() {
    if (!this.currentSession) return;
    this.currentSession.encryptionInfo.isVerifiedSAS = true;
    this.notify();
  }

  private startTimer() {
    this.stopTimer();
    this.durationTimer = setInterval(() => {
      if (this.currentSession && this.currentSession.status === 'connected') {
        this.currentSession.durationSeconds += 1;
        this.notify();
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  private cleanup() {
    this.stopTimer();
    this.stopRingTone();

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((t) => t.stop());
      this.remoteStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.notifyStreams();
    this.currentSession = null;
    this.notify();
  }
}

export const callManager = new CallManager();
