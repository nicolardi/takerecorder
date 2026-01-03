import React from 'react';
import { Music, Play, Pause } from 'lucide-react';
import { useMetronomeContext } from '../../contexts/MetronomeContext';

export function MetronomeQuickToggle({ isDark }) {
  const {
    bpm,
    isPlaying,
    currentBeat,
    timeSignature,
    openPanel,
    quickToggle,
  } = useMetronomeContext();

  return (
    <div className="flex items-center gap-1">
      {/* Play/Stop button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          quickToggle();
        }}
        className={`
          p-1.5 rounded-lg transition-all
          ${isPlaying
            ? 'bg-red-500 text-white active:bg-red-600'
            : isDark
              ? 'bg-green-600 text-white active:bg-green-700'
              : 'bg-green-500 text-white active:bg-green-600'
          }
        `}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>

      {/* BPM display / open panel button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          openPanel();
        }}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium
          transition-all select-none
          ${isPlaying
            ? 'bg-blue-500 text-white'
            : isDark
              ? 'bg-gray-700/50 text-gray-300'
              : 'bg-gray-200 text-gray-700'
          }
        `}
      >
        <Music
          className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`}
        />
        <span>{bpm}</span>
        {isPlaying && (
          <span className="ml-0.5 text-xs opacity-75">
            {currentBeat + 1}/{timeSignature.beats}
          </span>
        )}
      </button>
    </div>
  );
}

export default MetronomeQuickToggle;
