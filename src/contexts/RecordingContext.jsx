import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useRecordingTimer } from '../hooks/useRecordingTimer';
import { useMultipleCameras } from '../hooks/useMultipleCameras';
import { VIDEO_QUALITY_OPTIONS } from '../utils/settingsStorage';
import { getMetronomeStream, getAudioContext } from '../utils/metronomeAudio';

const RecordingContext = createContext(null);

export function RecordingProvider({ children }) {
  // Hooks
  const { settings, updateSetting } = useSettings();
  const { duration: recordingDuration, startTimer, stopTimer, resetTimer, formatDuration } = useRecordingTimer();
  const { hasMultipleCameras } = useMultipleCameras();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedMedia, setRecordedMedia] = useState(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [isInitialized, setIsInitialized] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [currentRecordingSaved, setCurrentRecordingSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  // Orientation
  const [orientation, setOrientation] = useState(
    window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  );

  // Controller state
  const [showControllerPanel, setShowControllerPanel] = useState(false);
  const [controllerStatus, setControllerStatus] = useState({ type: null, name: null });
  const [lastInput, setLastInput] = useState(null);
  const [leftPedalKey, setLeftPedalKey] = useState(settings.leftPedalKey);
  const [rightPedalKey, setRightPedalKey] = useState(settings.rightPedalKey);
  const [isListeningForKey, setIsListeningForKey] = useState(null);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(settings.audioFeedbackEnabled);

  // Refs
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingDurationRef = useRef(0);
  const videoPlaybackRef = useRef(null);

  // Audio feedback refs
  const recordingSoundRef = useRef(null);
  const stopSoundRef = useRef(null);
  const playingSoundRef = useRef(null);

  // Derived state
  const isDark = settings.theme === 'dark' || settings.theme === 'incognito';
  const isIncognito = settings.theme === 'incognito';

  // Handle orientation changes
  useEffect(() => {
    const handleResize = () => {
      const newOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      if (newOrientation !== orientation) {
        setOrientation(newOrientation);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [orientation]);

  // Initialize audio elements
  useEffect(() => {
    recordingSoundRef.current = new Audio('/sounds/start-recording.mp3');
    stopSoundRef.current = new Audio('/sounds/stop-recording.mp3');
    playingSoundRef.current = new Audio('/sounds/playing.mp3');

    recordingSoundRef.current.volume = 0.5;
    stopSoundRef.current.volume = 0.5;
    playingSoundRef.current.volume = 0.3;
  }, []);

  // Audio feedback functions (disabled in incognito mode)
  const playRecordingSound = useCallback(() => {
    if (audioFeedbackEnabled && !isIncognito && recordingSoundRef.current) {
      recordingSoundRef.current.currentTime = 0;
      recordingSoundRef.current.play().catch(() => {});
    }
  }, [audioFeedbackEnabled, isIncognito]);

  const playStopSound = useCallback(() => {
    if (audioFeedbackEnabled && !isIncognito && stopSoundRef.current) {
      stopSoundRef.current.currentTime = 0;
      stopSoundRef.current.play().catch(() => {});
    }
  }, [audioFeedbackEnabled, isIncognito]);

  const playPlayingSound = useCallback(() => {
    if (audioFeedbackEnabled && !isIncognito && playingSoundRef.current) {
      playingSoundRef.current.currentTime = 0;
      playingSoundRef.current.play().catch(() => {});
    }
  }, [audioFeedbackEnabled, isIncognito]);

  // Initialize media stream
  const initMedia = useCallback(async (facing = facingMode, currentOrientation = orientation, shouldPlaySound = true, withVideo = videoEnabled) => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const quality = VIDEO_QUALITY_OPTIONS[settings.videoQuality] || VIDEO_QUALITY_OPTIONS['1080p'];
      let mediaStream;

      if (withVideo) {
        const isLandscape = currentOrientation === 'landscape';
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: {
            facingMode: facing,
            width: { ideal: isLandscape ? quality.width : quality.height },
            height: { ideal: isLandscape ? quality.height : quality.width },
          }
        };

        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e) {
          const fallbackConstraints = {
            audio: true,
            video: { facingMode: facing }
          };
          mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        }
      } else {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false
        });
      }

      setStream(mediaStream);
      setError(null);
      setIsInitialized(true);

      if (withVideo && videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      if (shouldPlaySound) {
        playPlayingSound();
      }

      return mediaStream;
    } catch (err) {
      console.error('Errore accesso media:', err);
      setError('Impossibile accedere a microfono/camera. Controlla i permessi.');
      return null;
    }
  }, [stream, facingMode, orientation, videoEnabled, settings.videoQuality, playPlayingSound]);

  // Ref for mixed stream (when recording metronome audio)
  const mixedStreamRef = useRef(null);

  // Create a mixed audio stream (microphone + metronome)
  const createMixedStream = useCallback((micStream, metronomeStream) => {
    try {
      const audioContext = getAudioContext();

      // Create a destination for the mixed audio
      const destination = audioContext.createMediaStreamDestination();

      // Connect microphone audio
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);

      // Connect metronome audio
      if (metronomeStream) {
        const metronomeSource = audioContext.createMediaStreamSource(metronomeStream);
        metronomeSource.connect(destination);
      }

      // Create new stream with video track (if any) + mixed audio
      const videoTracks = micStream.getVideoTracks();
      const mixedAudioTrack = destination.stream.getAudioTracks()[0];

      const mixedStream = new MediaStream();
      videoTracks.forEach(track => mixedStream.addTrack(track));
      if (mixedAudioTrack) {
        mixedStream.addTrack(mixedAudioTrack);
      }

      return mixedStream;
    } catch (error) {
      console.error('Error creating mixed stream:', error);
      return micStream; // Fallback to original stream
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async (recordMetronome = false) => {
    if (isRecording) return;

    let currentStream = stream;
    if (!currentStream) {
      currentStream = await initMedia(facingMode, orientation, false, videoEnabled);
      if (!currentStream) return;
    }

    try {
      const quality = VIDEO_QUALITY_OPTIONS[settings.videoQuality] || VIDEO_QUALITY_OPTIONS['1080p'];
      const mimeType = videoEnabled
        ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm')
        : (MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm');

      const options = {
        mimeType,
        videoBitsPerSecond: videoEnabled ? quality.bitrate : undefined,
        audioBitsPerSecond: 128000,
      };

      // Check if we need to mix metronome audio
      let streamToRecord = currentStream;
      if (recordMetronome) {
        const metronomeStream = getMetronomeStream();
        if (metronomeStream) {
          streamToRecord = createMixedStream(currentStream, metronomeStream);
          mixedStreamRef.current = streamToRecord;
        }
      }

      mediaRecorderRef.current = new MediaRecorder(streamToRecord, options);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedMedia({
          url,
          blob,
          mimeType,
          isVideo: videoEnabled
        });
        setCurrentRecordingSaved(false);
        // Clean up mixed stream ref
        mixedStreamRef.current = null;
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      startTimer();
      playRecordingSound();
    } catch (err) {
      console.error('Errore avvio registrazione:', err);
      setError('Errore durante l\'avvio della registrazione.');
    }
  }, [isRecording, stream, initMedia, facingMode, orientation, videoEnabled, settings.videoQuality, startTimer, playRecordingSound, createMixedStream]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;

    try {
      recordingDurationRef.current = stopTimer();
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      playStopSound();
    } catch (err) {
      console.error('Errore stop registrazione:', err);
    }
  }, [isRecording, stopTimer, playStopSound]);

  // Toggle recording
  const toggleRecording = useCallback((recordMetronome = false) => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(recordMetronome);
    }
  }, [isRecording, startRecording, stopRecording]);

  // Discard recording
  const discardRecording = useCallback(() => {
    if (recordedMedia?.url) {
      URL.revokeObjectURL(recordedMedia.url);
    }
    setRecordedMedia(null);
    setCurrentRecordingSaved(false);
    resetTimer();
  }, [recordedMedia, resetTimer]);

  // Switch camera
  const switchCamera = useCallback(() => {
    if (isRecording || !videoEnabled) return;
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    initMedia(newFacing, orientation, false, videoEnabled);
  }, [isRecording, videoEnabled, facingMode, initMedia, orientation]);

  // Toggle video mode
  const toggleVideoMode = useCallback(() => {
    if (isRecording) return;
    const newVideoEnabled = !videoEnabled;
    setVideoEnabled(newVideoEnabled);

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsInitialized(false);

    if (newVideoEnabled) {
      initMedia(facingMode, orientation, true, true);
    }
  }, [isRecording, videoEnabled, stream, initMedia, facingMode, orientation]);

  // Play recorded media
  const playRecordedMedia = useCallback(() => {
    if (!recordedMedia?.url) return;
    setIsPlaying(true);
    playPlayingSound();

    if (recordedMedia.isVideo && videoPlaybackRef.current) {
      videoPlaybackRef.current.src = recordedMedia.url;
      videoPlaybackRef.current.play();
    }
  }, [recordedMedia, playPlayingSound]);

  // Stop playback
  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (videoPlaybackRef.current) {
      videoPlaybackRef.current.pause();
      videoPlaybackRef.current.currentTime = 0;
    }
  }, []);

  // Get recording duration
  const getRecordingDuration = useCallback(() => {
    return recordingDurationRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (recordedMedia?.url) {
        URL.revokeObjectURL(recordedMedia.url);
      }
    };
  }, []);

  // Toggle incognito mode
  const toggleIncognitoMode = useCallback(() => {
    const newTheme = settings.theme === 'incognito' ? 'dark' : 'incognito';
    updateSetting('theme', newTheme);
  }, [settings.theme, updateSetting]);

  const value = {
    // Settings
    settings,
    updateSetting,
    isDark,
    isIncognito,
    toggleIncognitoMode,

    // Recording state
    isRecording,
    recordedMedia,
    stream,
    error,
    setError,
    isInitialized,
    recordingDuration,
    formatDuration,
    getRecordingDuration,
    currentRecordingSaved,
    setCurrentRecordingSaved,
    saveMessage,
    setSaveMessage,

    // Video state
    videoEnabled,
    facingMode,
    hasMultipleCameras,
    orientation,
    isPlaying,
    hasUserInteracted,
    setHasUserInteracted,

    // Refs
    videoRef,
    videoPlaybackRef,

    // Recording functions
    initMedia,
    startRecording,
    stopRecording,
    toggleRecording,
    discardRecording,
    switchCamera,
    toggleVideoMode,
    playRecordedMedia,
    stopPlayback,

    // Controller state
    showControllerPanel,
    setShowControllerPanel,
    controllerStatus,
    setControllerStatus,
    lastInput,
    setLastInput,
    leftPedalKey,
    setLeftPedalKey,
    rightPedalKey,
    setRightPedalKey,
    isListeningForKey,
    setIsListeningForKey,
    audioFeedbackEnabled,
    setAudioFeedbackEnabled,

    // Audio feedback
    playRecordingSound,
    playStopSound,
    playPlayingSound,
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
}

export default RecordingContext;
