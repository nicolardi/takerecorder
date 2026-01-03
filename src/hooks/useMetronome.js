import { useState, useCallback, useRef, useEffect } from 'react';
import {
  startMetronome,
  stopMetronome,
  isMetronomeRunning,
  connectToRecording,
  getMetronomeStream,
  resumeAudioContext,
} from '../utils/metronomeAudio';

// Time signatures available
export const TIME_SIGNATURES = [
  { label: '4/4', beats: 4, noteValue: 4 },
  { label: '3/4', beats: 3, noteValue: 4 },
  { label: '2/4', beats: 2, noteValue: 4 },
  { label: '6/8', beats: 6, noteValue: 8 },
  { label: '5/4', beats: 5, noteValue: 4 },
  { label: '7/8', beats: 7, noteValue: 8 },
];

// BPM limits
export const MIN_BPM = 40;
export const MAX_BPM = 220;
export const DEFAULT_BPM = 120;

// Visual effects for beat visualization
export const BEAT_VISUAL_EFFECTS = [
  { id: 'pulse', name: 'Pulsazione', emoji: '💫', description: 'Cerchio che pulsa' },
  { id: 'ripple', name: 'Onde', emoji: '🌊', description: 'Onde concentriche' },
  { id: 'flash', name: 'Flash', emoji: '⚡', description: 'Lampo luminoso' },
  { id: 'bounce', name: 'Rimbalzo', emoji: '⚽', description: 'Pallina che rimbalza' },
  { id: 'pendulum', name: 'Pendolo', emoji: '🕰️', description: 'Oscillazione a pendolo' },
  { id: 'heartbeat', name: 'Battito', emoji: '💓', description: 'Cuore pulsante' },
  { id: 'radar', name: 'Radar', emoji: '📡', description: 'Scansione radar' },
  { id: 'firework', name: 'Fuochi', emoji: '🎆', description: 'Esplosione di scintille' },
  { id: 'vinyl', name: 'Vinile', emoji: '💿', description: 'Disco rotante' },
  { id: 'equalizer', name: 'Equalizer', emoji: '🎚️', description: 'Barre equalizzatore' },
];

export function useMetronome() {
  // State
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [timeSignature, setTimeSignature] = useState(TIME_SIGNATURES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [accentFirstBeat, setAccentFirstBeat] = useState(true);
  const [recordMetronomeAudio, setRecordMetronomeAudio] = useState(false);
  const [visualEffect, setVisualEffect] = useState('pulse');

  // Refs for current values (to avoid stale closures)
  const bpmRef = useRef(bpm);
  const timeSignatureRef = useRef(timeSignature);
  const accentFirstBeatRef = useRef(accentFirstBeat);
  const volumeRef = useRef(volume);

  // Keep refs updated
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    timeSignatureRef.current = timeSignature;
  }, [timeSignature]);

  useEffect(() => {
    accentFirstBeatRef.current = accentFirstBeat;
  }, [accentFirstBeat]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Update recording connection when toggle changes
  useEffect(() => {
    connectToRecording(recordMetronomeAudio);
  }, [recordMetronomeAudio]);

  // Beat callback
  const handleBeat = useCallback((beat) => {
    setCurrentBeat(beat);
  }, []);

  // Start metronome
  const start = useCallback(async () => {
    if (isMetronomeRunning()) return;

    await resumeAudioContext();
    await startMetronome(
      bpmRef.current,
      timeSignatureRef.current.beats,
      accentFirstBeatRef.current,
      volumeRef.current,
      handleBeat
    );
    setIsPlaying(true);
  }, [handleBeat]);

  // Stop metronome
  const stop = useCallback(() => {
    stopMetronome();
    setIsPlaying(false);
    setCurrentBeat(0);
  }, []);

  // Toggle metronome
  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  // Restart metronome with new settings (if playing)
  const restartIfPlaying = useCallback(async () => {
    if (isPlaying) {
      stop();
      // Small delay to ensure clean restart
      setTimeout(() => start(), 50);
    }
  }, [isPlaying, stop, start]);

  // Update BPM
  const updateBpm = useCallback((newBpm) => {
    const clampedBpm = Math.max(MIN_BPM, Math.min(MAX_BPM, newBpm));
    setBpm(clampedBpm);
    if (isPlaying) {
      restartIfPlaying();
    }
  }, [isPlaying, restartIfPlaying]);

  // Increment/decrement BPM
  const incrementBpm = useCallback((amount = 1) => {
    updateBpm(bpm + amount);
  }, [bpm, updateBpm]);

  const decrementBpm = useCallback((amount = 1) => {
    updateBpm(bpm - amount);
  }, [bpm, updateBpm]);

  // Update time signature
  const updateTimeSignature = useCallback((newTimeSignature) => {
    setTimeSignature(newTimeSignature);
    setCurrentBeat(0);
    if (isPlaying) {
      restartIfPlaying();
    }
  }, [isPlaying, restartIfPlaying]);

  // Update accent
  const updateAccentFirstBeat = useCallback((accent) => {
    setAccentFirstBeat(accent);
  }, []);

  // Update volume
  const updateVolume = useCallback((newVolume) => {
    setVolume(Math.max(0, Math.min(1, newVolume)));
  }, []);

  // Update visual effect
  const updateVisualEffect = useCallback((effectId) => {
    setVisualEffect(effectId);
  }, []);

  // Get metronome audio stream for recording
  const getAudioStream = useCallback(() => {
    if (recordMetronomeAudio) {
      return getMetronomeStream();
    }
    return null;
  }, [recordMetronomeAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMetronome();
    };
  }, []);

  return {
    // State
    bpm,
    timeSignature,
    isPlaying,
    currentBeat,
    volume,
    accentFirstBeat,
    recordMetronomeAudio,
    visualEffect,

    // Actions
    start,
    stop,
    toggle,
    updateBpm,
    incrementBpm,
    decrementBpm,
    updateTimeSignature,
    updateAccentFirstBeat,
    setAccentFirstBeat: updateAccentFirstBeat,
    updateVolume,
    setRecordMetronomeAudio,
    updateVisualEffect,

    // Utils
    getAudioStream,

    // Constants
    timeSignatures: TIME_SIGNATURES,
    minBpm: MIN_BPM,
    maxBpm: MAX_BPM,
    visualEffects: BEAT_VISUAL_EFFECTS,
  };
}

export default useMetronome;
