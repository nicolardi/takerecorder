import React from 'react';

export function BeatIndicator({ currentBeat, totalBeats, isPlaying, isDark }) {
  return (
    <div className="flex justify-center items-center gap-3 py-4">
      {Array.from({ length: totalBeats }, (_, i) => {
        const isActive = isPlaying && currentBeat === i;
        const isFirstBeat = i === 0;

        return (
          <div
            key={i}
            className={`
              w-8 h-8 rounded-full transition-all duration-100
              flex items-center justify-center text-xs font-medium
              ${isActive
                ? isFirstBeat
                  ? 'bg-red-500 scale-125 shadow-lg shadow-red-500/50'
                  : 'bg-blue-500 scale-110 shadow-lg shadow-blue-500/50'
                : isDark
                  ? 'bg-gray-700'
                  : 'bg-gray-300'
              }
              ${isActive ? 'text-white' : isDark ? 'text-gray-400' : 'text-gray-600'}
            `}
          >
            {i + 1}
          </div>
        );
      })}
    </div>
  );
}

export default BeatIndicator;
