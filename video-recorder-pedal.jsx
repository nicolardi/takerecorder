import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Video, Circle, Square, Play, RotateCcw, Download, Camera, AlertCircle, Footprints, Keyboard, Gamepad2, Settings, X } from 'lucide-react';

export default function VideoRecorderApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facingMode, setFacingMode] = useState('user');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Controller state
  const [showControllerPanel, setShowControllerPanel] = useState(false);
  const [controllerStatus, setControllerStatus] = useState({ type: null, name: null });
  const [lastInput, setLastInput] = useState(null);
  const [triggerKey, setTriggerKey] = useState(' '); // Default: Spacebar
  const [isListeningForKey, setIsListeningForKey] = useState(false);

  const videoPreviewRef = useRef(null);
  const videoPlaybackRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const gamepadIntervalRef = useRef(null);
  const isRecordingRef = useRef(false); // Per accesso sincrono negli event handler

  const MAX_DURATION = 30;

  // Mantieni isRecordingRef sincronizzato
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // ============================================
  // CAMERA INITIALIZATION
  // ============================================
  const initCamera = useCallback(async (facing = facingMode) => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = mediaStream;
      }
      
      setError(null);
      setIsInitialized(true);
    } catch (err) {
      console.error('Errore accesso camera:', err);
      setError('Impossibile accedere alla fotocamera. Verifica i permessi.');
    }
  }, [stream, facingMode]);

  // ============================================
  // RECORDING FUNCTIONS
  // ============================================
  const startRecording = useCallback(() => {
    if (!stream || isRecordingRef.current) return;

    chunksRef.current = [];
    setRecordedVideo(null);
    setRecordingTime(0);

    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    
    try {
      mediaRecorderRef.current = new MediaRecorder(stream, options);
    } catch (e) {
      mediaRecorderRef.current = new MediaRecorder(stream);
    }

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideo({ url, blob });
    };

    mediaRecorderRef.current.start(100);
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= MAX_DURATION - 1) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  }, [stream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, []);

  // Toggle: se sta registrando ferma, altrimenti inizia
  const toggleRecording = useCallback(() => {
    if (isRecordingRef.current) {
      stopRecording();
    } else if (!recordedVideo) {
      startRecording();
    }
  }, [startRecording, stopRecording, recordedVideo]);

  const resetRecording = () => {
    if (recordedVideo?.url) {
      URL.revokeObjectURL(recordedVideo.url);
    }
    setRecordedVideo(null);
    setRecordingTime(0);
  };

  const downloadVideo = () => {
    if (!recordedVideo) return;
    const a = document.createElement('a');
    a.href = recordedVideo.url;
    a.download = `video-${Date.now()}.webm`;
    a.click();
  };

  const switchCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    await initCamera(newFacing);
  };

  // ============================================
  // KEYBOARD / PEDAL SUPPORT
  // Molti pedali USB emulano una tastiera e inviano
  // keypress configurabili (Space, PageDown, ecc.)
  // ============================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Se stiamo configurando il tasto trigger
      if (isListeningForKey) {
        e.preventDefault();
        setTriggerKey(e.key);
        setIsListeningForKey(false);
        setLastInput(`Tasto configurato: "${e.key === ' ' ? 'Spazio' : e.key}"`);
        return;
      }

      // Controlla se il tasto premuto è il trigger configurato
      if (e.key === triggerKey) {
        e.preventDefault();
        setLastInput(`Tastiera: "${e.key === ' ' ? 'Spazio' : e.key}"`);
        setControllerStatus({ type: 'keyboard', name: 'Tastiera/Pedale USB' });
        toggleRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerKey, isListeningForKey, toggleRecording]);

  // ============================================
  // GAMEPAD API SUPPORT
  // Per pedali che si presentano come controller
  // ============================================
  useEffect(() => {
    const handleGamepadConnected = (e) => {
      console.log('Gamepad connesso:', e.gamepad.id);
      setControllerStatus({ type: 'gamepad', name: e.gamepad.id });
      setLastInput('Gamepad connesso!');
    };

    const handleGamepadDisconnected = (e) => {
      console.log('Gamepad disconnesso:', e.gamepad.id);
      setControllerStatus({ type: null, name: null });
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    // Polling per leggere lo stato del gamepad
    // (i gamepad non generano eventi per i pulsanti)
    let lastButtonState = false;
    
    gamepadIntervalRef.current = setInterval(() => {
      const gamepads = navigator.getGamepads();
      for (const gamepad of gamepads) {
        if (gamepad) {
          // Controlla il primo pulsante (o tutti)
          const buttonPressed = gamepad.buttons.some(btn => btn.pressed);
          
          // Trigger solo sul fronte di salita (pressione, non rilascio)
          if (buttonPressed && !lastButtonState) {
            setLastInput(`Gamepad: Pulsante premuto`);
            toggleRecording();
          }
          lastButtonState = buttonPressed;
        }
      }
    }, 50);

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
      if (gamepadIntervalRef.current) {
        clearInterval(gamepadIntervalRef.current);
      }
    };
  }, [toggleRecording]);

  // ============================================
  // INITIALIZATION & CLEANUP
  // ============================================
  useEffect(() => {
    initCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (recordingTime / MAX_DURATION) * 100;

  const getKeyDisplayName = (key) => {
    const keyNames = {
      ' ': 'Spazio',
      'PageDown': 'Page Down',
      'PageUp': 'Page Up',
      'Enter': 'Invio',
      'Escape': 'Esc'
    };
    return keyNames[key] || key;
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-6 h-6 text-red-500" />
            <span className="text-white font-semibold">QuickVideo</span>
          </div>
          
          <div className="flex items-center gap-3">
            {isRecording && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white font-mono">{formatTime(recordingTime)}</span>
              </div>
            )}
            
            {/* Controller indicator */}
            <button
              onClick={() => setShowControllerPanel(true)}
              className="p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
            >
              {controllerStatus.type === 'gamepad' ? (
                <Gamepad2 className="w-5 h-5 text-green-400" />
              ) : (
                <Footprints className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>
        
        {isRecording && (
          <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Controller Panel Modal */}
      {showControllerPanel && (
        <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Controller Setup
              </h2>
              <button 
                onClick={() => setShowControllerPanel(false)}
                className="p-1 rounded-full hover:bg-gray-800"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Keyboard/Pedal Section */}
            <div className="mb-6">
              <h3 className="text-gray-400 text-sm mb-3 flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                Pedale USB / Tastiera
              </h3>
              <p className="text-gray-500 text-xs mb-3">
                La maggior parte dei pedali USB emula tasti della tastiera. Configura quale tasto attiva la registrazione.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-800 rounded-lg p-3 text-center">
                  <span className="text-white font-mono text-lg">
                    {getKeyDisplayName(triggerKey)}
                  </span>
                </div>
                <button
                  onClick={() => setIsListeningForKey(true)}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    isListeningForKey 
                      ? 'bg-yellow-600 text-white animate-pulse' 
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {isListeningForKey ? 'Premi tasto...' : 'Cambia'}
                </button>
              </div>
            </div>

            {/* Gamepad Section */}
            <div className="mb-6">
              <h3 className="text-gray-400 text-sm mb-3 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4" />
                Gamepad / Controller
              </h3>
              <div className="bg-gray-800 rounded-lg p-3">
                {controllerStatus.type === 'gamepad' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-green-400 text-sm truncate">
                      {controllerStatus.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">
                    Nessun gamepad rilevato
                  </span>
                )}
              </div>
            </div>

            {/* Last Input */}
            {lastInput && (
              <div className="bg-gray-800 rounded-lg p-3 mb-4">
                <span className="text-gray-400 text-xs">Ultimo input:</span>
                <p className="text-white text-sm mt-1">{lastInput}</p>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4">
              <h4 className="text-blue-400 text-sm font-medium mb-2">Come funziona</h4>
              <ul className="text-blue-300/80 text-xs space-y-1">
                <li>• Premi il pedale/tasto per iniziare a registrare</li>
                <li>• Premi di nuovo per fermare la registrazione</li>
                <li>• La maggior parte dei pedali USB usa Spazio o Page Down</li>
                <li>• I pedali gaming vengono rilevati automaticamente</li>
              </ul>
            </div>

            <button
              onClick={() => setShowControllerPanel(false)}
              className="w-full mt-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Video Area */}
      <div className="flex-1 relative">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-6">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <p className="text-white text-center">{error}</p>
            <button 
              onClick={() => initCamera()}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-full"
            >
              Riprova
            </button>
          </div>
        ) : recordedVideo ? (
          <video
            ref={videoPlaybackRef}
            src={recordedVideo.url}
            className="w-full h-full object-cover"
            controls
            autoPlay
            playsInline
          />
        ) : (
          <video
            ref={videoPreviewRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
        )}

        {/* Visual feedback quando si usa il pedale */}
        {!recordedVideo && lastInput && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full">
            <span className="text-white text-sm flex items-center gap-2">
              <Footprints className="w-4 h-4 text-green-400" />
              {lastInput}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-6 pb-8">
        {recordedVideo ? (
          <div className="flex items-center justify-center gap-8">
            <button onClick={resetRecording} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs">Riprendi</span>
            </button>
            
            <button onClick={() => videoPlaybackRef.current?.play()} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
              <span className="text-white text-xs">Play</span>
            </button>
            
            <button onClick={downloadVideo} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center">
                <Download className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs">Salva</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-8">
            <div className="w-14 h-14" />
            
            <button
              onClick={toggleRecording}
              disabled={!isInitialized}
              className="relative"
            >
              <div className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${!isInitialized ? 'opacity-50' : ''}`}>
                {isRecording ? (
                  <Square className="w-8 h-8 text-red-500 fill-red-500" />
                ) : (
                  <Circle className="w-14 h-14 text-red-500 fill-red-500" />
                )}
              </div>
            </button>
            
            <button
              onClick={switchCamera}
              disabled={isRecording || !isInitialized}
              className={`w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center ${isRecording ? 'opacity-50' : ''}`}
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
          </div>
        )}
        
        {!recordedVideo && !isRecording && (
          <p className="text-gray-400 text-center text-sm mt-4">
            Tocca o premi <span className="text-white font-mono bg-gray-800 px-2 py-0.5 rounded">{getKeyDisplayName(triggerKey)}</span> per registrare
          </p>
        )}
      </div>
    </div>
  );
}
