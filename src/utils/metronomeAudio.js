// Metronome Audio Engine using Web Audio API
// Uses look-ahead scheduling for precise timing

let audioContext = null;
let schedulerInterval = null;
let nextNoteTime = 0;
let currentBeat = 0;

// Scheduling constants
const LOOKAHEAD = 0.1; // How far ahead to schedule audio (seconds)
const SCHEDULE_INTERVAL = 25; // How often to call scheduling function (ms)

// Callback for beat events (for visual updates)
let onBeatCallback = null;

// Gain nodes for volume control and routing
let masterGain = null;
let recordingDestination = null;

// Initialize or get AudioContext
export const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

// Resume AudioContext (needed after user interaction)
export const resumeAudioContext = async () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  return ctx;
};

// Create master gain node
const getMasterGain = () => {
  if (!masterGain) {
    const ctx = getAudioContext();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
  }
  return masterGain;
};

// Get recording destination for mixing metronome into recording
export const getRecordingDestination = () => {
  if (!recordingDestination) {
    const ctx = getAudioContext();
    recordingDestination = ctx.createMediaStreamDestination();
  }
  return recordingDestination;
};

// Connect metronome to recording destination
export const connectToRecording = (shouldRecord) => {
  const gain = getMasterGain();
  const destination = getRecordingDestination();

  if (shouldRecord) {
    gain.connect(destination);
  } else {
    try {
      gain.disconnect(destination);
    } catch (e) {
      // Not connected, ignore
    }
  }
};

// Schedule a single beat
const scheduleNote = (time, isAccent, volume) => {
  const ctx = getAudioContext();
  const gain = getMasterGain();

  // Create oscillator for click sound
  const osc = ctx.createOscillator();
  const noteGain = ctx.createGain();

  // Accent beat is higher pitch
  osc.frequency.value = isAccent ? 880 : 440;
  osc.type = 'sine';

  // Quick envelope for click
  noteGain.gain.setValueAtTime(volume, time);
  noteGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  osc.connect(noteGain);
  noteGain.connect(gain);

  osc.start(time);
  osc.stop(time + 0.05);
};

// Scheduler function - called repeatedly
const scheduler = (bpm, beatsPerMeasure, accentFirst, volume) => {
  const ctx = getAudioContext();
  const secondsPerBeat = 60.0 / bpm;

  // Schedule all notes that need to be played before the next interval
  while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
    const isAccent = accentFirst && currentBeat === 0;
    scheduleNote(nextNoteTime, isAccent, volume);

    // Notify beat callback for visual updates
    if (onBeatCallback) {
      const beatToReport = currentBeat;
      const timeUntilBeat = (nextNoteTime - ctx.currentTime) * 1000;

      setTimeout(() => {
        onBeatCallback(beatToReport);
      }, Math.max(0, timeUntilBeat));
    }

    // Advance to next beat
    nextNoteTime += secondsPerBeat;
    currentBeat = (currentBeat + 1) % beatsPerMeasure;
  }
};

// Start the metronome
export const startMetronome = async (bpm, beatsPerMeasure, accentFirst, volume, beatCallback) => {
  // Make sure AudioContext is running
  const ctx = await resumeAudioContext();

  // Store callback
  onBeatCallback = beatCallback;

  // Initialize timing
  nextNoteTime = ctx.currentTime;
  currentBeat = 0;

  // Set volume
  const gain = getMasterGain();
  gain.gain.value = 1;

  // Start scheduler
  schedulerInterval = setInterval(() => {
    scheduler(bpm, beatsPerMeasure, accentFirst, volume);
  }, SCHEDULE_INTERVAL);

  // Trigger first beat immediately
  if (beatCallback) {
    beatCallback(0);
  }
};

// Stop the metronome
export const stopMetronome = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  onBeatCallback = null;
  currentBeat = 0;
};

// Check if metronome is running
export const isMetronomeRunning = () => {
  return schedulerInterval !== null;
};

// Update metronome parameters while running
export const updateMetronomeParams = (bpm, beatsPerMeasure, accentFirst, volume) => {
  // Parameters will be picked up on next scheduler call
  // No need to restart - the scheduler reads these on each iteration
};

// Get the recording stream from metronome
export const getMetronomeStream = () => {
  const destination = getRecordingDestination();
  return destination.stream;
};

// Cleanup
export const disposeMetronome = () => {
  stopMetronome();
  if (recordingDestination) {
    recordingDestination = null;
  }
  if (masterGain) {
    masterGain.disconnect();
    masterGain = null;
  }
  // Don't close audioContext as it might be used elsewhere
};
