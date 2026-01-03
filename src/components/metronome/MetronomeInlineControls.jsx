import React from 'react';
import { Play, Pause, Minus, Plus, Settings } from 'lucide-react';
import { useMetronomeContext } from '../../contexts/MetronomeContext';
import { BeatVisualizer } from './BeatVisualizer';

export function MetronomeInlineControls({ isDark, showVisualizer = true }) {
  const {
    bpm,
    isPlaying,
    currentBeat,
    timeSignature,
    visualEffect,
    visualEffects,
    toggle,
    incrementBpm,
    decrementBpm,
    openPanel,
  } = useMetronomeContext();

  // Get current visual effect info
  const currentEffectInfo = visualEffects?.find(e => e.id === visualEffect) || visualEffects?.[0];

  return (
    <div className={`
      w-full max-w-md mx-auto rounded-2xl p-4
      ${isDark ? 'bg-gray-800/50' : 'bg-white/80'}
      backdrop-blur-sm
    `}>
      {/* Beat Visualizer - mostra l'effetto visivo selezionato */}
      {showVisualizer && isPlaying && (
        <div className="flex justify-center mb-4">
          <BeatVisualizer
            currentBeat={currentBeat}
            totalBeats={timeSignature.beats}
            isPlaying={isPlaying}
            effect={visualEffect}
            bpm={bpm}
            compact={true}
          />
        </div>
      )}

      {/* Beat indicator row */}
      <div className="flex justify-center items-center gap-2 mb-4">
        {Array.from({ length: timeSignature.beats }, (_, i) => {
          const isActive = isPlaying && currentBeat === i;
          const isFirstBeat = i === 0;

          return (
            <div
              key={i}
              className={`
                w-6 h-6 rounded-full transition-all duration-75
                flex items-center justify-center text-xs font-medium
                ${isActive
                  ? isFirstBeat
                    ? 'bg-red-500 scale-125 shadow-lg shadow-red-500/50 text-white'
                    : 'bg-blue-500 scale-110 shadow-lg shadow-blue-500/50 text-white'
                  : isDark
                    ? 'bg-gray-700 text-gray-500'
                    : 'bg-gray-200 text-gray-400'
                }
              `}
            >
              {i + 1}
            </div>
          );
        })}
      </div>

      {/* Main controls row */}
      <div className="flex items-center justify-center gap-3">
        {/* Decrement BPM */}
        <button
          onClick={() => decrementBpm(5)}
          className={`
            p-2 rounded-full transition-colors
            ${isDark
              ? 'bg-gray-700 active:bg-gray-600 text-white'
              : 'bg-gray-200 active:bg-gray-300 text-gray-700'
            }
          `}
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Play/Stop + BPM display */}
        <button
          onClick={toggle}
          className={`
            flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-xl
            transition-all
            ${isPlaying
              ? 'bg-red-500 text-white active:bg-red-600 scale-105'
              : isDark
                ? 'bg-green-600 text-white active:bg-green-700'
                : 'bg-green-500 text-white active:bg-green-600'
            }
          `}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
          <span>{bpm}</span>
          <span className="text-sm font-normal opacity-75">BPM</span>
        </button>

        {/* Increment BPM */}
        <button
          onClick={() => incrementBpm(5)}
          className={`
            p-2 rounded-full transition-colors
            ${isDark
              ? 'bg-gray-700 active:bg-gray-600 text-white'
              : 'bg-gray-200 active:bg-gray-300 text-gray-700'
            }
          `}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom row: time signature + effect + settings */}
      <div className="flex items-center justify-between mt-4">
        {/* Time signature */}
        <div className={`
          px-3 py-1 rounded-lg text-sm font-medium
          ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}
        `}>
          {timeSignature.label}
        </div>

        {/* Current visual effect */}
        <div className={`
          flex items-center gap-1 text-sm
          ${isDark ? 'text-gray-400' : 'text-gray-500'}
        `}>
          <span>{currentEffectInfo?.emoji}</span>
          <span>{currentEffectInfo?.name}</span>
        </div>

        {/* Settings button */}
        <button
          onClick={openPanel}
          className={`
            p-2 rounded-lg transition-colors
            ${isDark
              ? 'bg-gray-700 active:bg-gray-600 text-gray-300'
              : 'bg-gray-200 active:bg-gray-300 text-gray-600'
            }
          `}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default MetronomeInlineControls;
