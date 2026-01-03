import React from 'react';
import { Minus, Plus, ChevronDown, Volume2 } from 'lucide-react';
import { TIME_SIGNATURES } from '../../hooks/useMetronome';
import { useTapTempo } from '../../hooks/useTapTempo';

export function MetronomeControls({
  bpm,
  minBpm,
  maxBpm,
  timeSignature,
  accentFirstBeat,
  recordMetronomeAudio,
  visualEffect,
  visualEffects,
  volume,
  onBpmChange,
  onIncrementBpm,
  onDecrementBpm,
  onTimeSignatureChange,
  onAccentFirstBeatChange,
  onRecordMetronomeAudioChange,
  onVisualEffectChange,
  onVolumeChange,
  isDark,
}) {
  // Tap tempo hook
  const { tap, tapCount, isActive: tapActive, minTapsNeeded } = useTapTempo(onBpmChange);

  // Time signature dropdown state
  const [showTimeSignatures, setShowTimeSignatures] = React.useState(false);

  // Get current visual effect info
  const currentVisualEffect = visualEffects?.find(e => e.id === visualEffect) || visualEffects?.[0];

  return (
    <div className="space-y-6">
      {/* BPM Display and Slider */}
      <div className="text-center">
        <div className={`text-5xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {bpm}
        </div>
        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          BPM
        </div>
      </div>

      {/* BPM Slider */}
      <div className="px-4">
        <input
          type="range"
          min={minBpm}
          max={maxBpm}
          value={bpm}
          onChange={(e) => onBpmChange(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between mt-1">
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{minBpm}</span>
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{maxBpm}</span>
        </div>
      </div>

      {/* BPM +/- Buttons */}
      <div className="flex justify-center items-center gap-4">
        <button
          onClick={() => onDecrementBpm(5)}
          className={`p-3 rounded-full ${isDark ? 'bg-gray-700 active:bg-gray-600' : 'bg-gray-200 active:bg-gray-300'}`}
        >
          <Minus className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-700'}`} />
        </button>

        <button
          onClick={() => onDecrementBpm(1)}
          className={`p-2 rounded-full ${isDark ? 'bg-gray-800 active:bg-gray-700' : 'bg-gray-100 active:bg-gray-200'}`}
        >
          <Minus className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>

        <button
          onClick={() => onIncrementBpm(1)}
          className={`p-2 rounded-full ${isDark ? 'bg-gray-800 active:bg-gray-700' : 'bg-gray-100 active:bg-gray-200'}`}
        >
          <Plus className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>

        <button
          onClick={() => onIncrementBpm(5)}
          className={`p-3 rounded-full ${isDark ? 'bg-gray-700 active:bg-gray-600' : 'bg-gray-200 active:bg-gray-300'}`}
        >
          <Plus className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-700'}`} />
        </button>
      </div>

      {/* Tap Tempo */}
      <div className="text-center">
        <button
          onClick={tap}
          className={`
            px-8 py-4 rounded-xl font-medium text-lg transition-all
            ${tapActive
              ? 'bg-blue-500 text-white scale-95'
              : isDark
                ? 'bg-gray-700 text-white active:bg-gray-600'
                : 'bg-gray-200 text-gray-800 active:bg-gray-300'
            }
          `}
        >
          TAP
        </button>
        <div className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {tapCount >= minTapsNeeded
            ? `${tapCount} tap - BPM calcolato!`
            : tapCount === 0
              ? 'Batti il tempo per impostare i BPM'
              : `Ancora ${minTapsNeeded - tapCount} tap...`}
        </div>
      </div>

      {/* Time Signature Selector */}
      <div className="relative">
        <label className={`block text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Battuta
        </label>
        <button
          onClick={() => setShowTimeSignatures(!showTimeSignatures)}
          className={`
            w-full p-3 rounded-lg flex items-center justify-between
            ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}
          `}
        >
          <span className="text-lg font-medium">{timeSignature.label}</span>
          <ChevronDown className={`w-5 h-5 transition-transform ${showTimeSignatures ? 'rotate-180' : ''}`} />
        </button>

        {showTimeSignatures && (
          <div className={`
            absolute z-10 w-full mt-1 rounded-lg shadow-lg overflow-hidden
            ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}
          `}>
            {TIME_SIGNATURES.map((ts) => (
              <button
                key={ts.label}
                onClick={() => {
                  onTimeSignatureChange(ts);
                  setShowTimeSignatures(false);
                }}
                className={`
                  w-full p-3 text-left transition-colors
                  ${timeSignature.label === ts.label
                    ? 'bg-blue-500 text-white'
                    : isDark
                      ? 'text-white hover:bg-gray-600'
                      : 'text-gray-800 hover:bg-gray-100'
                  }
                `}
              >
                {ts.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Visual Effect Selector */}
      {visualEffects && visualEffects.length > 0 && (
        <div>
          <label className={`block text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Effetto Visivo
          </label>
          <div className="grid grid-cols-5 gap-2">
            {visualEffects.map((effect) => (
              <button
                key={effect.id}
                onClick={() => onVisualEffectChange(effect.id)}
                className={`
                  p-2 rounded-lg flex flex-col items-center justify-center transition-all
                  ${visualEffect === effect.id
                    ? 'bg-blue-500 text-white scale-105 shadow-lg'
                    : isDark
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }
                `}
                title={effect.description}
              >
                <span className="text-xl">{effect.emoji}</span>
                <span className="text-[10px] mt-1 truncate w-full text-center">{effect.name}</span>
              </button>
            ))}
          </div>
          {currentVisualEffect && (
            <p className={`text-xs mt-2 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {currentVisualEffect.description}
            </p>
          )}
        </div>
      )}

      {/* Volume Control */}
      <div>
        <label className={`flex items-center gap-2 text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <Volume2 className="w-4 h-4" />
          Volume: {Math.round((volume || 0.7) * 100)}%
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round((volume || 0.7) * 100)}
          onChange={(e) => onVolumeChange && onVolumeChange(parseInt(e.target.value, 10) / 100)}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between mt-1">
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>0%</span>
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>100%</span>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {/* Accent first beat */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accentFirstBeat}
            onChange={(e) => onAccentFirstBeatChange(e.target.checked)}
            className="w-5 h-5 rounded accent-blue-500"
          />
          <span className={isDark ? 'text-white' : 'text-gray-800'}>
            Accento sul primo beat
          </span>
        </label>

        {/* Record metronome audio */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={recordMetronomeAudio}
            onChange={(e) => onRecordMetronomeAudioChange(e.target.checked)}
            className="w-5 h-5 rounded accent-blue-500"
          />
          <span className={isDark ? 'text-white' : 'text-gray-800'}>
            Registra click nella traccia
          </span>
        </label>
      </div>
    </div>
  );
}

export default MetronomeControls;
