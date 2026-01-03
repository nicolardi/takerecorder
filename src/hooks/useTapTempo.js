import { useState, useCallback, useRef } from 'react';
import { MIN_BPM, MAX_BPM } from './useMetronome';

// Number of taps to average
const MIN_TAPS = 2;
const MAX_TAPS = 8;

// Time window to reset taps (ms)
const RESET_TIMEOUT = 2000;

export function useTapTempo(onBpmChange) {
  const [tapCount, setTapCount] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Refs for timing
  const tapTimesRef = useRef([]);
  const resetTimeoutRef = useRef(null);

  // Calculate BPM from tap times
  const calculateBpm = useCallback((times) => {
    if (times.length < MIN_TAPS) return null;

    // Calculate intervals between taps
    const intervals = [];
    for (let i = 1; i < times.length; i++) {
      intervals.push(times[i] - times[i - 1]);
    }

    // Average interval in ms
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Convert to BPM
    const bpm = Math.round(60000 / avgInterval);

    // Clamp to valid range
    return Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
  }, []);

  // Handle tap
  const tap = useCallback(() => {
    const now = Date.now();

    // Clear reset timeout
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    // Add new tap time
    const newTimes = [...tapTimesRef.current, now];

    // Keep only recent taps (within reset window)
    const recentTimes = newTimes.filter(t => now - t < RESET_TIMEOUT * MAX_TAPS);

    // Limit to max taps
    if (recentTimes.length > MAX_TAPS) {
      recentTimes.shift();
    }

    tapTimesRef.current = recentTimes;
    setTapCount(recentTimes.length);
    setIsActive(true);

    // Calculate and report BPM
    const bpm = calculateBpm(recentTimes);
    if (bpm && onBpmChange) {
      onBpmChange(bpm);
    }

    // Set reset timeout
    resetTimeoutRef.current = setTimeout(() => {
      reset();
    }, RESET_TIMEOUT);
  }, [calculateBpm, onBpmChange]);

  // Reset taps
  const reset = useCallback(() => {
    tapTimesRef.current = [];
    setTapCount(0);
    setIsActive(false);
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
  }, []);

  return {
    tap,
    reset,
    tapCount,
    isActive,
    minTapsNeeded: MIN_TAPS,
  };
}

export default useTapTempo;
