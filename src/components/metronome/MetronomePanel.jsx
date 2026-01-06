import React, { useState } from 'react';
import { X, Play, Pause, Save, Check } from 'lucide-react';
import { useMetronomeContext } from '../../contexts/MetronomeContext';
import { BeatIndicator } from './BeatIndicator';
import { BeatVisualizer } from './BeatVisualizer';
import { MetronomeControls } from './MetronomeControls';

export function MetronomePanel({ isDark }) {
  const {
    isPanelOpen,
    closePanel,
    bpm,
    minBpm,
    maxBpm,
    timeSignature,
    isPlaying,
    currentBeat,
    accentFirstBeat,
    recordMetronomeAudio,
    visualEffect,
    visualEffects,
    volume,
    toggle,
    updateBpm,
    incrementBpm,
    decrementBpm,
    updateTimeSignature,
    setAccentFirstBeat,
    setRecordMetronomeAudio,
    updateVisualEffect,
    updateVolume,
    currentTrackId,
    saveAsTrackDefault,
  } = useMetronomeContext();

  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isPanelOpen) return null;

  const handleSaveDefault = async () => {
    const success = await saveAsTrackDefault();
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closePanel}
      />

      {/* Panel wrapper - relative container for close button */}
      <div className="relative w-full sm:max-w-md mx-auto">
        {/* Close button - positioned outside panel like other modals */}
        <button
          onClick={closePanel}
          className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg active:bg-red-700 z-10"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Panel */}
        <div
          className={`
            rounded-t-3xl sm:rounded-2xl
            max-h-[90vh] overflow-y-auto
            ${isDark ? 'bg-gray-900' : 'bg-white'}
          `}
        >
          {/* Header */}
          <div className={`
            sticky top-0 flex items-center justify-center p-4 border-b
            ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}
          `}>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Metronomo
            </h2>
          </div>

        {/* Content */}
        <div className="p-6">
          {/* Beat Visualizer - shows the selected effect */}
          <div className="flex justify-center mb-4">
            <BeatVisualizer
              currentBeat={currentBeat}
              totalBeats={timeSignature.beats}
              isPlaying={isPlaying}
              effect={visualEffect}
              bpm={bpm}
            />
          </div>

          {/* Beat Indicator (dots) */}
          <BeatIndicator
            currentBeat={currentBeat}
            totalBeats={timeSignature.beats}
            isPlaying={isPlaying}
            isDark={isDark}
          />

          {/* Controls */}
          <MetronomeControls
            bpm={bpm}
            minBpm={minBpm}
            maxBpm={maxBpm}
            timeSignature={timeSignature}
            accentFirstBeat={accentFirstBeat}
            recordMetronomeAudio={recordMetronomeAudio}
            visualEffect={visualEffect}
            visualEffects={visualEffects}
            volume={volume}
            onBpmChange={updateBpm}
            onIncrementBpm={incrementBpm}
            onDecrementBpm={decrementBpm}
            onTimeSignatureChange={updateTimeSignature}
            onAccentFirstBeatChange={setAccentFirstBeat}
            onRecordMetronomeAudioChange={setRecordMetronomeAudio}
            onVisualEffectChange={updateVisualEffect}
            onVolumeChange={updateVolume}
            isDark={isDark}
          />

          {/* Play/Stop Button */}
          <div className="mt-6">
            <button
              onClick={toggle}
              className={`
                w-full py-4 rounded-xl font-medium text-lg flex items-center justify-center gap-2
                ${isPlaying
                  ? 'bg-red-500 text-white active:bg-red-600'
                  : 'bg-blue-500 text-white active:bg-blue-600'
                }
              `}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-6 h-6" />
                  STOP
                </>
              ) : (
                <>
                  <Play className="w-6 h-6" />
                  AVVIA
                </>
              )}
            </button>
          </div>

          {/* Save as default for track */}
          {currentTrackId && (
            <div className="mt-4">
              <button
                onClick={handleSaveDefault}
                disabled={saveSuccess}
                className={`
                  w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2
                  ${saveSuccess
                    ? 'bg-green-500 text-white'
                    : isDark
                      ? 'bg-gray-700 text-white active:bg-gray-600'
                      : 'bg-gray-200 text-gray-800 active:bg-gray-300'
                  }
                `}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-5 h-5" />
                    Salvato!
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Salva come default per questo brano
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

export default MetronomePanel;
