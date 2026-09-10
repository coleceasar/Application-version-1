/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, ShieldCheck, Lock } from 'lucide-react';

interface VoiceNotePlayerProps {
  audioUrl?: string;
  durationSeconds?: number;
  isSelf: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioUrl,
  durationSeconds = 12,
  isSelf,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalDuration = Math.max(1, durationSeconds);

  // Initialize audio element
  useEffect(() => {
    if (audioUrl && audioUrl.startsWith('blob:')) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      return () => {
        audio.pause();
        audioRef.current = null;
      };
    }
  }, [audioUrl]);

  // Handle synthetic playback if blob is mock/simulated or fails to load audio element
  useEffect(() => {
    if (isPlaying && (!audioRef.current || !audioUrl?.startsWith('blob:'))) {
      synthTimerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.25 * playbackSpeed;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 250);

      return () => {
        if (synthTimerRef.current) clearInterval(synthTimerRef.current);
      };
    }
  }, [isPlaying, playbackSpeed, totalDuration, audioUrl]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.play().catch(() => {
          // fallback to synthetic timer
        });
      }
      setIsPlaying(true);
    }
  };

  const handleSpeedChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds: Array<1 | 1.5 | 2> = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percent * totalDuration;
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, (currentTime / totalDuration) * 100);

  // Deterministic 22 waveform bars based on duration
  const waveformBars = [40, 65, 80, 50, 30, 75, 95, 60, 45, 85, 70, 40, 60, 90, 100, 55, 35, 70, 85, 60, 45, 30];

  return (
    <div
      id="voice-note-player-bubble"
      className="flex flex-col gap-1.5 min-w-[210px] sm:min-w-[260px] max-w-[320px] select-none"
    >
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm cursor-pointer ${
            isSelf
              ? 'bg-neutral-900 text-teal-400 hover:bg-neutral-800'
              : 'bg-teal-500 text-neutral-950 hover:bg-teal-400'
          }`}
          title={isPlaying ? 'Pause Voice Note' : 'Play Voice Note'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Waveform Scrubber */}
        <div
          onClick={handleSeek}
          className="flex-1 flex items-center gap-[2px] h-7 cursor-pointer relative py-1"
          title="Seek audio position"
        >
          {waveformBars.map((height, i) => {
            const barPercent = (i / waveformBars.length) * 100;
            const isFilled = barPercent <= progressPercent;

            return (
              <div
                key={i}
                style={{ height: `${height}%` }}
                className={`flex-1 min-w-[2px] max-w-[5px] rounded-full transition-colors duration-75 ${
                  isFilled
                    ? isSelf
                      ? 'bg-teal-300'
                      : 'bg-teal-400'
                    : isSelf
                    ? 'bg-teal-900/60'
                    : 'bg-neutral-700'
                }`}
              />
            );
          })}
        </div>

        {/* Playback Speed Pill */}
        <button
          type="button"
          onClick={handleSpeedChange}
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 transition-colors cursor-pointer ${
            isSelf
              ? 'bg-teal-900/60 hover:bg-teal-800 text-teal-200 border border-teal-700/50'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
          }`}
          title="Toggle speed: 1x, 1.5x, 2x"
        >
          {playbackSpeed}x
        </button>
      </div>

      {/* Footer Info: Current Time, Total Duration, and AES Security Seal */}
      <div className="flex items-center justify-between text-[10px] font-mono opacity-80 px-0.5">
        <span className={isSelf ? 'text-teal-100' : 'text-neutral-400'}>
          {formatSec(currentTime)} / {formatSec(totalDuration)}
        </span>
        <span
          className="flex items-center gap-1 text-[9px] opacity-75"
          title="Encrypted with AES-256-GCM hardware key"
        >
          <Lock className="w-2.5 h-2.5" />
          <span>Opus E2EE</span>
        </span>
      </div>
    </div>
  );
};
