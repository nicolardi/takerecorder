import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useMetronome, TIME_SIGNATURES, DEFAULT_BPM } from '../hooks/useMetronome';
import { getTrackTempo, updateTrackTempo } from '../videoLibrary';

const MetronomeContext = createContext(null);

export function MetronomeProvider({ children }) {
  // Core metronome hook
  const metronome = useMetronome();

  // Panel visibility state
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Current track ID (for saving/loading BPM per track)
  const [currentTrackId, setCurrentTrackId] = useState(null);

  // Load saved BPM when track changes
  useEffect(() => {
    const loadTrackTempo = async () => {
      if (currentTrackId) {
        try {
          const tempo = await getTrackTempo(currentTrackId);
          if (tempo) {
            if (tempo.bpm) {
              metronome.updateBpm(tempo.bpm);
            }
            if (tempo.timeSignature) {
              const ts = TIME_SIGNATURES.find(
                t => t.beats === tempo.timeSignature.beats &&
                     t.noteValue === tempo.timeSignature.noteValue
              );
              if (ts) {
                metronome.updateTimeSignature(ts);
              }
            }
          }
        } catch (error) {
          console.error('Error loading track tempo:', error);
        }
      }
    };

    loadTrackTempo();
  }, [currentTrackId]);

  // Save current BPM/time signature as default for current track
  const saveAsTrackDefault = useCallback(async () => {
    if (!currentTrackId) return false;

    try {
      await updateTrackTempo(currentTrackId, metronome.bpm, {
        beats: metronome.timeSignature.beats,
        noteValue: metronome.timeSignature.noteValue,
      });
      return true;
    } catch (error) {
      console.error('Error saving track tempo:', error);
      return false;
    }
  }, [currentTrackId, metronome.bpm, metronome.timeSignature]);

  // Open/close panel
  const openPanel = useCallback(() => setIsPanelOpen(true), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);
  const togglePanel = useCallback(() => setIsPanelOpen(prev => !prev), []);

  // Quick toggle (start/stop from quick button)
  const quickToggle = useCallback(() => {
    metronome.toggle();
  }, [metronome]);

  const value = {
    // Metronome state and actions
    ...metronome,

    // Panel state
    isPanelOpen,
    openPanel,
    closePanel,
    togglePanel,

    // Track association
    currentTrackId,
    setCurrentTrackId,
    saveAsTrackDefault,

    // Quick toggle
    quickToggle,
  };

  return (
    <MetronomeContext.Provider value={value}>
      {children}
    </MetronomeContext.Provider>
  );
}

export function useMetronomeContext() {
  const context = useContext(MetronomeContext);
  if (!context) {
    throw new Error('useMetronomeContext must be used within a MetronomeProvider');
  }
  return context;
}

export default MetronomeContext;
