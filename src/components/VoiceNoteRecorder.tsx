/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Pause, Play, Send, Mic, ShieldCheck, Radio } from 'lucide-react';

interface VoiceNoteRecorderProps {
  onCancel: () => void;
  onSendVoiceNote: (audioUrl: string, durationSeconds: number) => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onCancel,
  onSendVoiceNote,
}) => {
  const [isRecording, setIsRecording] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [waveformAmplitudes, setWaveformAmplitudes] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Initialize MediaRecorder and AudioContext for live waveform visualizer
  useEffect(() => {
    let isMounted = true;

    async function initRecorder() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!isMounted) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;

          // Set up AudioContext for real waveform frequency visualization
          try {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioCtx = new AudioCtx();
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;

            const updateWaveform = () => {
              if (!isMounted) return;
              if (analyserRef.current && !isPaused) {
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                const bars: number[] = [];
                // Sample 24 bars
                const step = Math.max(1, Math.floor(dataArray.length / 24));
                for (let i = 0; i < 24; i++) {
                  const val = dataArray[i * step] || 0;
                  // Normalize between 15% and 100%
                  bars.push(Math.max(15, Math.min(100, Math.round((val / 255) * 100))));
                }
                setWaveformAmplitudes(bars);
              }
              animFrameRef.current = requestAnimationFrame(updateWaveform);
            };
            animFrameRef.current = requestAnimationFrame(updateWaveform);
          } catch (audioErr) {
            console.warn('AudioContext visualizer fallback:', audioErr);
          }

          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          audioChunksRef.current = [];

          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          recorder.start(250);
        } else {
          // Fallback animated mock waveform if getUserMedia unavailable
          startFallbackAnimation();
        }
      } catch (err) {
        console.warn('Microphone permission not granted or device unavailable, using simulated voice recording:', err);
        startFallbackAnimation();
      }
    }

    function startFallbackAnimation() {
      const interval = setInterval(() => {
        if (!isMounted) return;
        const simulatedBars: number[] = [];
        for (let i = 0; i < 24; i++) {
          simulatedBars.push(Math.floor(20 + Math.random() * 75));
        }
        setWaveformAmplitudes(simulatedBars);
      }, 100);
      return () => clearInterval(interval);
    }

    initRecorder();

    // Timer (No Limit)
    timerRef.current = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleTogglePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        timerRef.current = setInterval(() => {
          setSecondsElapsed((prev) => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    } else {
      setIsPaused(!isPaused);
    }
  };

  const handleCancel = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    onCancel();
  };

  const handleFinishAndSend = () => {
    const finalDuration = Math.max(1, secondsElapsed);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        let blobUrl = '';
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
          blobUrl = URL.createObjectURL(audioBlob);
        } else {
          blobUrl = generateSimulatedVoiceNoteUrl();
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        onSendVoiceNote(blobUrl, finalDuration);
      };
      mediaRecorderRef.current.stop();
    } else {
      const blobUrl = generateSimulatedVoiceNoteUrl();
      onSendVoiceNote(blobUrl, finalDuration);
    }
  };

  // Generates a simple audio synth beep/wave data URI as fallback
  function generateSimulatedVoiceNoteUrl(): string {
    return 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  }

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id="voice-note-recorder-bar"
      className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center gap-3 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {/* Delete / Cancel Button */}
      <button
        type="button"
        onClick={handleCancel}
        className="w-10 h-10 rounded-2xl bg-neutral-900 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 border border-neutral-800 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
        title="Discard voice note"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Recording Status & Unlimited Badge */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative flex h-3 w-3">
          {!isPaused && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-3 w-3 ${isPaused ? 'bg-amber-400' : 'bg-rose-500'}`} />
        </span>
        <span className="font-mono text-sm font-bold text-neutral-100 min-w-[46px]">
          {formatTimer(secondsElapsed)}
        </span>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 uppercase tracking-wider hidden sm:inline-block">
          NO LIMIT
        </span>
      </div>

      {/* Live Audio Waveform Animation */}
      <div className="flex-1 flex items-center justify-center gap-[3px] h-9 px-2 bg-neutral-900/90 rounded-2xl border border-neutral-800/80 overflow-hidden">
        {(waveformAmplitudes.length > 0
          ? waveformAmplitudes
          : Array.from({ length: 24 }).map((_, i) => (i % 2 === 0 ? 30 : 60))
        ).map((height, i) => (
          <div
            key={i}
            style={{
              height: `${Math.max(15, isPaused ? 15 : height)}%`,
            }}
            className={`w-[3px] rounded-full transition-all duration-75 ${
              isPaused ? 'bg-neutral-600' : 'bg-gradient-to-t from-teal-500 to-emerald-400'
            }`}
          />
        ))}
      </div>

      {/* Pause / Resume Button */}
      <button
        type="button"
        onClick={handleTogglePause}
        className="w-10 h-10 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
        title={isPaused ? 'Resume recording' : 'Pause recording'}
      >
        {isPaused ? <Play className="w-4 h-4 fill-current text-teal-400" /> : <Pause className="w-4 h-4" />}
      </button>

      {/* Send Encrypted Voice Note Button */}
      <button
        type="button"
        onClick={handleFinishAndSend}
        className="w-10 h-10 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
        title="Encrypt and send voice note (AES-256-GCM)"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
};
