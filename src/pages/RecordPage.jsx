import React, { useEffect, useCallback, useRef } from 'react';
import { Video, Circle, Square, Play, RotateCcw, AlertCircle, X, Share2, Music, Mic } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { useRecording } from '../contexts/RecordingContext';
import { useMetronomeContext } from '../contexts/MetronomeContext';
import { SessionPickerModal } from '../components/modals/SessionPickerModal';
import { TakePlayerModal } from '../components/modals/TakePlayerModal';
import { MetronomeQuickToggle } from '../components/metronome/MetronomeQuickToggle';
import { MetronomePanel } from '../components/metronome/MetronomePanel';

// Long press duration in ms for toggle incognito
const LONG_PRESS_DURATION = 800;

export function RecordPage() {
  const {
    currentSession,
    showSessionPicker,
    setShowSessionPicker,
    saveNewTake,
  } = useSession();

  const { setCurrentTrackId, recordMetronomeAudio, stop: stopMetronome, start: startMetronome, isPlaying: isMetronomePlaying } = useMetronomeContext();

  const {
    settings,
    isDark,
    isIncognito,
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
    saveMessage,
    setSaveMessage,
    videoEnabled,
    facingMode,
    hasMultipleCameras,
    orientation,
    isPlaying,
    hasUserInteracted,
    setHasUserInteracted,
    videoRef,
    videoPlaybackRef,
    initMedia,
    startRecording,
    stopRecording,
    toggleRecording,
    discardRecording,
    switchCamera,
    toggleVideoMode,
    setFacingModeWithSave,
    setVideoEnabledWithSave,
    stopStream,
    playRecordedMedia,
    stopPlayback,
    leftPedalKey,
    rightPedalKey,
    isListeningForKey,
    setIsListeningForKey,
    audioFeedbackEnabled,
    playPlayingSound,
    toggleIncognitoMode,
  } = useRecording();

  // Playback state for take from library
  const [playingTake, setPlayingTake] = React.useState(null);

  // Long press refs for incognito toggle
  const longPressTimerRef = useRef(null);
  const isLongPressRef = useRef(false);

  // Track if metronome was playing before playback (to restore it after discard)
  const wasMetronomePlayingRef = useRef(false);

  // Update metronome track ID when session changes
  useEffect(() => {
    setCurrentTrackId(currentSession?.trackId || null);
  }, [currentSession?.trackId, setCurrentTrackId]);

  // Cleanup: stop stream when leaving the record page
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Auto-start playback when recording stops and media is available
  useEffect(() => {
    if (recordedMedia && !isRecording) {
      // Save metronome state before stopping
      wasMetronomePlayingRef.current = isMetronomePlaying;
      if (isMetronomePlaying) {
        stopMetronome();
      }
      // Small delay to ensure metronome audio is fully stopped
      setTimeout(() => {
        playRecordedMedia();
      }, 100);
    }
  }, [recordedMedia]); // Only trigger when recordedMedia changes

  // Wrapper for toggleRecording that passes metronome flag
  const handleToggleRecording = useCallback(() => {
    toggleRecording(recordMetronomeAudio);
  }, [toggleRecording, recordMetronomeAudio]);

  // Wrapper for playRecordedMedia that stops metronome first
  const handlePlayRecordedMedia = useCallback(() => {
    // Save metronome state before stopping
    wasMetronomePlayingRef.current = isMetronomePlaying;
    if (isMetronomePlaying) {
      stopMetronome();
      // Small delay to ensure metronome audio is fully stopped
      setTimeout(() => {
        playRecordedMedia();
      }, 100);
    } else {
      playRecordedMedia();
    }
  }, [isMetronomePlaying, stopMetronome, playRecordedMedia]);

  // Wrapper for discardRecording that restores metronome if it was playing
  const handleDiscardRecording = useCallback(() => {
    discardRecording();
    // Restore metronome if it was playing before playback
    if (wasMetronomePlayingRef.current) {
      wasMetronomePlayingRef.current = false;
      startMetronome();
    }
  }, [discardRecording, startMetronome]);

  // Long press handlers for incognito toggle
  const handleTouchStart = useCallback(() => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      toggleIncognitoMode();
    }, LONG_PRESS_DURATION);
  }, [toggleIncognitoMode]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Prevent context menu on long press (mobile)
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  // Keyboard handling for pedals
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Key binding mode
      if (isListeningForKey) {
        e.preventDefault();
        if (isListeningForKey === 'left') {
          // Update left pedal key - handled by settings
        } else if (isListeningForKey === 'right') {
          // Update right pedal key - handled by settings
        }
        setIsListeningForKey(null);
        return;
      }

      // Left pedal - Recording
      if (e.key === leftPedalKey) {
        e.preventDefault();
        if (!showSessionPicker && currentSession) {
          handleToggleRecording();
        }
      }

      // Right pedal - Play
      if (e.key === rightPedalKey) {
        e.preventDefault();
        if (recordedMedia && !isRecording) {
          if (isPlaying) {
            stopPlayback();
          } else {
            handlePlayRecordedMedia();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isListeningForKey,
    leftPedalKey,
    rightPedalKey,
    showSessionPicker,
    currentSession,
    handleToggleRecording,
    recordedMedia,
    isRecording,
    isPlaying,
    stopPlayback,
    handlePlayRecordedMedia,
    setIsListeningForKey,
  ]);

  // Initialize media on first interaction
  const handleFirstInteraction = useCallback(() => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      if (videoEnabled && !stream) {
        initMedia();
      }
    }
  }, [hasUserInteracted, videoEnabled, stream, initMedia, setHasUserInteracted]);

  // Handle save recording
  const handleManualSave = useCallback(async () => {
    if (!recordedMedia?.blob || !currentSession?.trackId || currentRecordingSaved) return;

    try {
      const duration = getRecordingDuration();
      const takeId = await saveNewTake(recordedMedia.blob, recordedMedia.mimeType, duration);

      if (takeId) {
        setSaveMessage('Salvato!');
        // After saving, return to record mode
        setTimeout(() => {
          setSaveMessage(null);
          // Discard recording and restore metronome if it was playing
          discardRecording();
          if (wasMetronomePlayingRef.current) {
            wasMetronomePlayingRef.current = false;
            startMetronome();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Errore salvataggio:', error);
      setSaveMessage('Errore!');
      setTimeout(() => setSaveMessage(null), 2000);
    }
  }, [recordedMedia, currentSession, currentRecordingSaved, getRecordingDuration, saveNewTake, setSaveMessage, discardRecording, startMetronome]);

  // Share recording
  const shareRecording = useCallback(async () => {
    if (!recordedMedia?.blob) return;

    try {
      const extension = recordedMedia.isVideo ? 'webm' : 'webm';
      const filename = `take_${Date.now()}.${extension}`;
      const file = new File([recordedMedia.blob], filename, { type: recordedMedia.mimeType });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Take registrato',
        });
      } else {
        const url = URL.createObjectURL(recordedMedia.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Errore condivisione:', error);
    }
  }, [recordedMedia]);

  // Close playing take modal
  const closePlayingTake = useCallback(() => {
    setPlayingTake(null);
  }, []);

  // Share playing take
  const sharePlayingTake = useCallback(async () => {
    if (!playingTake?.videoBlob) return;
    try {
      const extension = playingTake.mimeType?.includes('video') ? 'webm' : 'webm';
      const filename = `take_${Date.now()}.${extension}`;
      const file = new File([playingTake.videoBlob], filename, { type: playingTake.mimeType });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Take registrato' });
      } else {
        const url = URL.createObjectURL(playingTake.videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Errore condivisione:', error);
    }
  }, [playingTake]);

  // Delete playing take
  const deletePlayingTake = useCallback(async () => {
    if (!playingTake?.id) return;
    if (!confirm('Eliminare questo take?')) return;
    // TODO: Call deleteTake from context
    closePlayingTake();
  }, [playingTake, closePlayingTake]);


  // Track if we need to auto-save in incognito
  const pendingIncognitoSaveRef = useRef(false);

  // Auto-save when recordedMedia becomes available in incognito mode
  useEffect(() => {
    if (isIncognito && pendingIncognitoSaveRef.current && recordedMedia?.blob && !isRecording) {
      pendingIncognitoSaveRef.current = false;
      const duration = getRecordingDuration();

      // Save as incognito take (no session required)
      saveNewTake(recordedMedia.blob, recordedMedia.mimeType, duration, true)
        .then(() => {
          // Discard after save to be ready for next recording
          discardRecording();
        })
        .catch((error) => {
          console.error('Errore salvataggio automatico:', error);
          discardRecording();
        });
    }
  }, [isIncognito, recordedMedia, isRecording, getRecordingDuration, saveNewTake, discardRecording]);

  // Incognito tap handler - tap anywhere to start/stop (no session needed)
  const handleIncognitoTap = useCallback(() => {
    // Don't process if it was a long press
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    if (isRecording) {
      // Mark that we need to auto-save when recording stops
      pendingIncognitoSaveRef.current = true;
      stopRecording();
    } else {
      // Force VIDEO mode with BACK camera (environment) for incognito
      // Update settings so they persist
      setFacingModeWithSave('environment');
      setVideoEnabledWithSave(true);
      // Reinitialize with correct settings for incognito
      initMedia('environment', orientation, false, true).then(() => {
        startRecording();
      });
    }
  }, [isRecording, stopRecording, initMedia, orientation, startRecording, setFacingModeWithSave, setVideoEnabledWithSave]);

  // INCOGNITO MODE - Minimal black UI for concert VIDEO recording
  if (isIncognito) {
    return (
      <div
        className="h-full flex flex-col bg-black select-none"
        onClick={handleFirstInteraction}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        {/* Hidden video element for recording */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="hidden"
        />

        {/* Error message */}
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-900/90 text-red-100 px-4 py-3 rounded-xl flex items-center gap-3 z-30">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Full screen tap area */}
        <button
          className="flex-1 flex flex-col items-center justify-center p-4 active:bg-white/5"
          onClick={handleIncognitoTap}
        >
          {/* Recording status - very subtle */}
          <div className="flex flex-col items-center gap-4">
            {isRecording ? (
              <>
                <div className="w-4 h-4 bg-red-900 rounded-full animate-pulse opacity-30" />
                <span className="text-gray-800 font-mono text-xs opacity-30">
                  {formatDuration(recordingDuration)}
                </span>
              </>
            ) : (
              <>
                <div className="w-4 h-4 bg-gray-900 rounded-full opacity-20" />
                <span className="text-gray-900 text-xs opacity-20">Tap</span>
              </>
            )}
          </div>

          {/* Long press hint */}
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-gray-900 text-[8px] opacity-10">
              Tieni premuto per uscire
            </p>
          </div>
        </button>

        {/* Session Picker Modal - still accessible */}
        <SessionPickerModal />
      </div>
    );
  }

  // NORMAL MODE
  return (
    <div
      className={`h-full flex flex-col select-none ${isDark ? 'bg-black' : 'bg-gray-100'}`}
      onClick={handleFirstInteraction}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onContextMenu={handleContextMenu}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {/* Session Header */}
      <div className={`flex-shrink-0 ${isDark ? 'bg-gray-900/90' : 'bg-white/90'} backdrop-blur-sm border-b ${isDark ? 'border-gray-800' : 'border-gray-200'} px-3 py-2 sm:px-4 sm:py-3`}>
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          <button
            onClick={() => setShowSessionPicker(true)}
            className="flex items-center gap-2 min-w-0 flex-1"
          >
            <Music className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              {currentSession ? (
                <>
                  <p className={`text-xs sm:text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {currentSession.fragmentName || currentSession.trackName}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                    {[
                      currentSession.fragmentName ? currentSession.trackName : null,
                      currentSession.operaName,
                      currentSession.authorName
                    ].filter(Boolean).join(' > ')}
                  </p>
                </>
              ) : (
                <p className="text-gray-400 text-xs sm:text-sm">Seleziona brano...</p>
              )}
            </div>
          </button>

          {/* Metronome quick toggle */}
          {currentSession && (
            <div className="flex items-center flex-shrink-0">
              <MetronomeQuickToggle isDark={isDark} />
            </div>
          )}
        </div>
      </div>

      {/* Main content area - full height with overlaid controls */}
      <div className="flex-1 relative overflow-hidden">
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-900/90 text-red-100 px-4 py-3 rounded-xl flex items-center gap-3 z-30">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Save message */}
        {saveMessage && !isIncognito && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium z-30">
            {saveMessage}
          </div>
        )}

        {/* Video preview or audio mode indicator - FULL AREA */}
        <div className={`absolute inset-0 ${isDark ? 'bg-gray-900' : 'bg-gray-200'}`}>
          {videoEnabled ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-3 bg-black/60 px-4 py-2 rounded-full z-20">
                  <div className="w-5 h-5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white font-mono text-lg font-bold">REC</span>
                  <span className="text-white font-mono text-sm">{formatDuration(recordingDuration)}</span>
                </div>
              )}

              {/* Camera switch button */}
              {hasMultipleCameras && !isRecording && !recordedMedia && (
                <button
                  onClick={switchCamera}
                  className="absolute top-4 right-4 p-3 bg-black/50 rounded-full active:bg-black/70 z-20"
                >
                  <RotateCcw className="w-5 h-5 text-white" />
                </button>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <Mic className={`w-20 h-20 ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
              {isRecording && (
                <p className="mt-4 text-2xl font-mono text-white">{formatDuration(recordingDuration)}</p>
              )}
            </div>
          )}

          {/* Recorded media playback overlay */}
          {recordedMedia && !isRecording && (
            <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
              {recordedMedia.isVideo ? (
                <video
                  ref={videoPlaybackRef}
                  className="w-full h-full object-contain"
                  controls={false}
                  playsInline
                  loop
                />
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Mic className={`w-16 h-16 ${isPlaying ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
                  {isPlaying && (
                    <p className="text-white text-sm">Riproduzione in corso...</p>
                  )}
                  <audio
                    ref={videoPlaybackRef}
                    loop
                    preload="auto"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Overlaid control buttons - bottom center */}
        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4 z-20">
          {/* Video/Audio toggle - only show when not in playback mode */}
          {!recordedMedia && (
            <button
              onClick={toggleVideoMode}
              disabled={isRecording}
              className={`p-3 rounded-full ${videoEnabled ? 'bg-blue-600' : 'bg-gray-700'} disabled:opacity-50 shadow-lg`}
            >
              {videoEnabled ? <Video className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
            </button>
          )}

          {/* Record button */}
          {!recordedMedia && (
            <button
              onClick={handleToggleRecording}
              disabled={!currentSession}
              className={`p-3 rounded-full ${
                isRecording
                  ? 'bg-red-600 active:bg-red-700'
                  : 'bg-red-500 active:bg-red-600'
              } disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg`}
            >
              {isRecording ? (
                <Square className="w-5 h-5 text-white" />
              ) : (
                <Circle className="w-5 h-5 text-white fill-current" />
              )}
            </button>
          )}

          {/* Post-recording controls */}
          {recordedMedia && !isRecording && (
            <>
              {/* Discard */}
              <button
                onClick={handleDiscardRecording}
                className="p-3 rounded-full bg-red-600 active:bg-red-700 shadow-lg"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Play/Stop */}
              <button
                onClick={isPlaying ? stopPlayback : handlePlayRecordedMedia}
                className={`p-3 rounded-full ${isPlaying ? 'bg-yellow-600' : 'bg-green-600'} active:opacity-80 shadow-lg`}
              >
                {isPlaying ? <Square className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
              </button>

              {/* Save */}
              <button
                onClick={handleManualSave}
                disabled={currentRecordingSaved}
                className={`p-3 rounded-full ${
                  currentRecordingSaved
                    ? 'bg-green-800'
                    : 'bg-green-600 active:bg-green-700'
                } disabled:opacity-50 shadow-lg`}
              >
                {currentRecordingSaved ? (
                  <span className="text-white text-lg font-bold">✓</span>
                ) : (
                  <span className="text-white text-xs font-bold">Salva</span>
                )}
              </button>

              {/* Share */}
              <button
                onClick={shareRecording}
                className="p-3 rounded-full bg-blue-600 active:bg-blue-700 shadow-lg"
              >
                <Share2 className="w-5 h-5 text-white" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Session Picker Modal */}
      <SessionPickerModal />

      {/* Take Player Modal */}
      <TakePlayerModal
        playingTake={playingTake}
        onClose={closePlayingTake}
        onShare={sharePlayingTake}
        onDelete={deletePlayingTake}
      />

      {/* Metronome Panel */}
      <MetronomePanel isDark={isDark} />
    </div>
  );
}

export default RecordPage;
