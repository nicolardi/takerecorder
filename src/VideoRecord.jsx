import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Video, Circle, Square, Play, RotateCcw, AlertCircle, Keyboard, Gamepad2, Settings, X, Share2, Volume2, FolderOpen, Music, Trash2, ChevronRight, ChevronDown, Edit3, Plus, Check, BookOpen, HelpCircle, User, FileText, Mic, ArrowLeft, RefreshCw } from 'lucide-react';
import { BottomTabBar } from './components/BottomTabBar';
import { SessionsTab } from './components/tabs/SessionsTab';
import { StatisticsTab } from './components/tabs/StatisticsTab';
import { useSettings } from './hooks/useSettings';
import { useRecordingTimer } from './hooks/useRecordingTimer';
import { useMultipleCameras } from './hooks/useMultipleCameras';
import { VIDEO_QUALITY_OPTIONS } from './utils/settingsStorage';
import {
  initDB,
  createAuthor,
  createOpera,
  createTrack,
  createFragment,
  saveTake,
  getAllAuthors,
  getAllOperas,
  getAllTracks,
  deleteAuthor,
  deleteOpera,
  deleteTrack,
  deleteFragment,
  deleteTake,
  renameAuthor,
  renameOpera,
  renameTrack,
  renameFragment,
  renameTake,
  getFullLibrary,
  saveCurrentSession,
  getCurrentSession,
  getRecentSessions,
  searchRecentSessions,
  getTakesByTrack,
  getTakesByFragment,
} from './videoLibrary';

export default function VideoRecorderApp() {
  // Tab navigation
  const [activeTab, setActiveTab] = useState('registra');

  // Custom hooks
  const { settings, updateSetting } = useSettings();
  const { duration: recordingDuration, startTimer, stopTimer, resetTimer, formatDuration } = useRecordingTimer();
  const { hasMultipleCameras } = useMultipleCameras();

  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [recordedMedia, setRecordedMedia] = useState(null); // { url, blob, mimeType, isVideo }
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // Default: front camera
  const [isInitialized, setIsInitialized] = useState(false);

  // Audio/Video mode - default: audio only
  const [videoEnabled, setVideoEnabled] = useState(false);

  // Controller state
  const [showControllerPanel, setShowControllerPanel] = useState(false);
  const [controllerStatus, setControllerStatus] = useState({ type: null, name: null });
  const [lastInput, setLastInput] = useState(null);
  // Usa valori dalle impostazioni persistenti
  const [leftPedalKey, setLeftPedalKey] = useState(settings.leftPedalKey);
  const [rightPedalKey, setRightPedalKey] = useState(settings.rightPedalKey);
  const [isListeningForKey, setIsListeningForKey] = useState(null); // 'left' o 'right'
  const [isPlaying, setIsPlaying] = useState(false);
  const [orientation, setOrientation] = useState(
    window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  );
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Library state
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // Session: { operaId?, operaName?, collectionId, collectionName, trackId, trackName }
  const [currentSession, setCurrentSession] = useState(null);
  const [library, setLibrary] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [operas, setOperas] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [expandedAuthors, setExpandedAuthors] = useState({});
  const [expandedOperas, setExpandedOperas] = useState({});
  const [expandedTracks, setExpandedTracks] = useState({});
  const [expandedFragments, setExpandedFragments] = useState({});
  const [newAuthorName, setNewAuthorName] = useState('');
  const [newOperaName, setNewOperaName] = useState('');
  const [newTrackName, setNewTrackName] = useState('');
  const [newFragmentName, setNewFragmentName] = useState('');
  const [selectedAuthorId, setSelectedAuthorId] = useState(null);
  const [selectedOperaId, setSelectedOperaId] = useState(null);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [playingTake, setPlayingTake] = useState(null); // { url, mimeType, index, fragmentName }
  const [takeCount, setTakeCount] = useState(0);
  const [currentRecordingSaved, setCurrentRecordingSaved] = useState(false); // Traccia se la registrazione corrente è già salvata
  const [saveMessage, setSaveMessage] = useState(null); // Feedback dopo salvataggio

  // Stato per rinomina
  const [editingItem, setEditingItem] = useState(null); // { type: 'author'|'opera'|'track'|'fragment', id: string }
  const [editingName, setEditingName] = useState('');

  // Stato per sessioni recenti
  const [sessionPickerTab, setSessionPickerTab] = useState('recenti'); // 'recenti' | 'nuovo'
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentSessionsLoading, setRecentSessionsLoading] = useState(false);
  const [recentSessionsSearch, setRecentSessionsSearch] = useState('');
  const [recentSessionsPage, setRecentSessionsPage] = useState(0);
  const [hasMoreRecent, setHasMoreRecent] = useState(true);

  const videoPreviewRef = useRef(null);
  const videoPlaybackRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const gamepadIntervalRef = useRef(null);
  const isRecordingRef = useRef(false); // Per accesso sincrono negli event handler
  const isDiscardingRef = useRef(false); // Per distinguere stop da discard
  const videoContainerRef = useRef(null);
  const initialPinchDistance = useRef(null);
  const currentZoom = useRef(1);

  // Audio refs
  const audioStreamRef = useRef(null);

  // Mantieni isRecordingRef sincronizzato
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // ============================================
  // AUDIO FEEDBACK - 3 suoni distinti
  // NOTA: Disabilitato durante registrazione per evitare loopback su interfacce esterne
  // ============================================
  const audioContextRef = useRef(null);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true);

  const playSound = useCallback((frequencies, durations, type = 'sine') => {
    // NON riprodurre suoni durante la registrazione per evitare loopback
    if (isRecordingRef.current || !audioFeedbackEnabled) return;

    // Riusa AudioContext esistente o creane uno nuovo
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;

    // Riprendi se sospeso (iOS richiede interazione utente)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    let startTime = audioContext.currentTime;

    frequencies.forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = type;

      const duration = durations[i] / 1000;
      // Volume molto basso (0.05)
      gainNode.gain.setValueAtTime(0.05, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);

      startTime += duration + 0.05; // piccola pausa tra le note
    });
  }, [audioFeedbackEnabled]);

  // Suono PRONTO: due note ascendenti brevi (tipo "ding-dong" allegro)
  const playReadySound = useCallback(() => {
    playSound([523, 784], [100, 150], 'sine'); // Do5 -> Sol5
  }, [playSound]);

  // Suono RECORDING: nota singola lunga e grave
  const playRecordingSound = useCallback(() => {
    playSound([330], [300], 'triangle'); // Mi4 lungo
  }, [playSound]);

  // Suono PLAYING: tre beep rapidi discendenti (tipo allarme)
  const playPlayingSound = useCallback(() => {
    playSound([880, 660, 440], [80, 80, 120], 'square'); // La5 -> Mi5 -> La4
  }, [playSound]);

  // ============================================
  // LIBRARY FUNCTIONS
  // ============================================

  // Carica libreria completa
  const loadLibrary = useCallback(async () => {
    try {
      const fullLibrary = await getFullLibrary();
      setLibrary(fullLibrary);
      const allAuthors = await getAllAuthors();
      setAuthors(allAuthors);
      const allOperas = await getAllOperas();
      setOperas(allOperas);
      const allTracks = await getAllTracks();
      setTracks(allTracks);
    } catch (err) {
      console.error('Errore caricamento libreria:', err);
    }
  }, []);

  // Carica sessione salvata o mostra picker
  // Sessione: { authorId?, authorName?, operaId?, operaName?, trackId, trackName, fragmentId?, fragmentName? }
  const loadOrCreateSession = useCallback(async () => {
    await initDB();
    const saved = getCurrentSession();
    if (saved && saved.trackId) {
      setCurrentSession(saved);
      // Conta i take esistenti per questo frammento o brano
      if (saved.fragmentId) {
        const { getTakesByFragment } = await import('./videoLibrary');
        const takes = await getTakesByFragment(saved.fragmentId);
        setTakeCount(takes.length);
      } else {
        const takes = await getTakesByTrack(saved.trackId);
        setTakeCount(takes.length);
      }
    } else {
      // Nessuna sessione salvata, mostra picker
      setShowSessionPicker(true);
    }
    await loadLibrary();
  }, [loadLibrary]);

  // Crea nuovo autore
  const handleCreateAuthor = useCallback(async (name = null) => {
    const authorName = name || newAuthorName;
    if (!authorName.trim()) return;
    try {
      const author = await createAuthor(authorName);
      setAuthors(prev => [author, ...prev]);
      setSelectedAuthorId(author.id);
      setExpandedAuthors(prev => ({ ...prev, [author.id]: true }));
      setNewAuthorName('');
      await loadLibrary();
    } catch (err) {
      console.error('Errore creazione autore:', err);
    }
  }, [newAuthorName, loadLibrary]);

  // Crea nuova opera (opzionalmente dentro un autore)
  const handleCreateOpera = useCallback(async (authorId = null, name = null) => {
    const operaName = name || newOperaName;
    if (!operaName.trim()) return;
    try {
      const opera = await createOpera(operaName, authorId);
      setOperas(prev => [opera, ...prev]);
      setSelectedOperaId(opera.id);
      setExpandedOperas(prev => ({ ...prev, [opera.id]: true }));
      setNewOperaName('');
      await loadLibrary();
    } catch (err) {
      console.error('Errore creazione opera:', err);
    }
  }, [newOperaName, loadLibrary]);

  // Crea nuovo brano (opzionalmente dentro un'opera)
  const handleCreateTrack = useCallback(async (operaId = null, name = null) => {
    const trackName = name || newTrackName;
    if (!trackName.trim()) return;
    try {
      const track = await createTrack(trackName, operaId);
      setTracks(prev => [track, ...prev]);
      setSelectedTrackId(track.id);
      setExpandedTracks(prev => ({ ...prev, [track.id]: true }));
      setNewTrackName('');
      await loadLibrary();
    } catch (err) {
      console.error('Errore creazione brano:', err);
    }
  }, [newTrackName, loadLibrary]);

  // Crea nuovo frammento e imposta sessione
  const handleCreateFragment = useCallback(async (trackId, trackName, operaId = null, operaName = null, authorId = null, authorName = null) => {
    if (!newFragmentName.trim()) return;
    try {
      const fragment = await createFragment(trackId, newFragmentName);
      const session = {
        authorId,
        authorName,
        operaId,
        operaName,
        trackId,
        trackName,
        fragmentId: fragment.id,
        fragmentName: fragment.name,
      };
      setCurrentSession(session);
      saveCurrentSession(session);
      setNewFragmentName('');
      setShowSessionPicker(false);
      setTakeCount(0);
      await loadLibrary();
    } catch (err) {
      console.error('Errore creazione frammento:', err);
    }
  }, [newFragmentName, loadLibrary]);

  // Seleziona frammento esistente come sessione corrente
  const selectFragmentAsSession = useCallback(async (fragment, track, opera = null, author = null, closePicker = true) => {
    const session = {
      authorId: author?.id || null,
      authorName: author?.name || null,
      operaId: opera?.id || null,
      operaName: opera?.name || null,
      trackId: track.id,
      trackName: track.name,
      fragmentId: fragment?.id || null,
      fragmentName: fragment?.name || null,
    };
    setCurrentSession(session);
    await saveCurrentSession(session);
    if (fragment?.id) {
      const { getTakesByFragment } = await import('./videoLibrary');
      const takes = await getTakesByFragment(fragment.id);
      setTakeCount(takes.length);
    } else {
      const takes = await getTakesByTrack(track.id);
      setTakeCount(takes.length);
    }
    if (closePicker) {
      setShowSessionPicker(false);
      setShowLibrary(false);
    }
  }, []);

  // Seleziona solo un brano come sessione (senza fragment)
  const selectTrackAsSession = useCallback(async (track, opera = null, author = null) => {
    await selectFragmentAsSession(null, track, opera, author);
  }, [selectFragmentAsSession]);

  // Carica sessioni recenti
  const loadRecentSessionsData = useCallback(async (reset = false) => {
    setRecentSessionsLoading(true);
    try {
      const page = reset ? 0 : recentSessionsPage;
      const sessions = await getRecentSessions(20, page * 20);

      if (reset) {
        setRecentSessions(sessions);
        setRecentSessionsPage(1);
      } else {
        setRecentSessions(prev => [...prev, ...sessions]);
        setRecentSessionsPage(prev => prev + 1);
      }

      setHasMoreRecent(sessions.length === 20);
    } catch (err) {
      console.error('Errore caricamento sessioni recenti:', err);
    }
    setRecentSessionsLoading(false);
  }, [recentSessionsPage]);

  // Cerca sessioni recenti
  const handleRecentSessionsSearch = useCallback(async (query) => {
    setRecentSessionsSearch(query);
    if (query.trim()) {
      setRecentSessionsLoading(true);
      const results = await searchRecentSessions(query);
      setRecentSessions(results);
      setHasMoreRecent(false);
      setRecentSessionsLoading(false);
    } else {
      loadRecentSessionsData(true);
    }
  }, [loadRecentSessionsData]);

  // Apre il Session Picker ripristinando i valori dalla sessione corrente
  const openSessionPicker = useCallback(() => {
    if (currentSession) {
      setSelectedAuthorId(currentSession.authorId || null);
      setSelectedOperaId(currentSession.operaId || null);
      setSelectedTrackId(currentSession.trackId || null);
    }
    setSessionPickerTab('recenti');
    loadRecentSessionsData(true);
    setShowSessionPicker(true);
  }, [currentSession, loadRecentSessionsData]);

  // Formatta tempo relativo
  const formatTimeAgo = useCallback((timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Ora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m fa`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h fa`;
    return `${Math.floor(seconds / 86400)}g fa`;
  }, []);

  // Toggle espansione autore
  const toggleAuthor = useCallback((authorId) => {
    setExpandedAuthors(prev => ({
      ...prev,
      [authorId]: !prev[authorId]
    }));
  }, []);

  // Toggle espansione opera
  const toggleOpera = useCallback((operaId) => {
    setExpandedOperas(prev => ({
      ...prev,
      [operaId]: !prev[operaId]
    }));
  }, []);

  // Toggle espansione brano
  const toggleTrack = useCallback((trackId) => {
    setExpandedTracks(prev => ({
      ...prev,
      [trackId]: !prev[trackId]
    }));
  }, []);

  // Toggle espansione frammento
  const toggleFragment = useCallback((fragmentId) => {
    setExpandedFragments(prev => ({
      ...prev,
      [fragmentId]: !prev[fragmentId]
    }));
  }, []);

  // Elimina autore
  const handleDeleteAuthor = useCallback(async (authorId) => {
    if (!confirm('Eliminare questo autore e tutte le sue opere?')) return;
    try {
      await deleteAuthor(authorId);
      if (currentSession?.authorId === authorId) {
        setCurrentSession(null);
        setShowSessionPicker(true);
      }
      await loadLibrary();
    } catch (err) {
      console.error('Errore eliminazione autore:', err);
    }
  }, [currentSession, loadLibrary]);

  // Elimina opera
  const handleDeleteOpera = useCallback(async (operaId) => {
    if (!confirm('Eliminare questa opera e tutti i suoi brani?')) return;
    try {
      await deleteOpera(operaId);
      if (currentSession?.operaId === operaId) {
        setCurrentSession(null);
        setShowSessionPicker(true);
      }
      await loadLibrary();
    } catch (err) {
      console.error('Errore eliminazione opera:', err);
    }
  }, [currentSession, loadLibrary]);

  // Genera nome frammento con data/ora leggibile
  const generateFragmentName = useCallback(() => {
    const now = new Date();
    const date = now.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${date} ${time}`;
  }, []);

  // Salvataggio manuale - funziona anche senza sessione
  const handleManualSave = useCallback(async () => {
    if (!recordedVideo?.blob) {
      console.warn('Nessuna registrazione da salvare');
      return;
    }
    if (currentRecordingSaved) {
      console.warn('Registrazione già salvata');
      return;
    }

    try {
      let trackId = currentSession?.trackId;
      let fragmentId = currentSession?.fragmentId || null;

      // Se non c'è sessione con track, crea un brano con timestamp
      if (!trackId) {
        // Crea un brano "Registrazioni" se non esiste, o usa il brano selezionato
        trackId = selectedTrackId;
        if (!trackId) {
          // Cerca o crea un brano "Registrazioni rapide"
          let quickTrack = tracks.find(t => t.name === 'Registrazioni rapide' && !t.operaId);
          if (!quickTrack) {
            quickTrack = await createTrack('Registrazioni rapide', null);
            setTracks(prev => [quickTrack, ...prev]);
          }
          trackId = quickTrack.id;
        }

        // Se non c'è un fragment, ne crea uno con timestamp
        if (!fragmentId) {
          const fragmentName = generateFragmentName();
          const fragment = await createFragment(trackId, fragmentName);
          fragmentId = fragment.id;
        }
      }

      // Salva il take (nuova firma: blob, mimeType, trackId, fragmentId, duration)
      await saveTake(recordedVideo.blob, recordedVideo.mimeType, trackId, fragmentId, recordingDuration);
      setTakeCount(prev => prev + 1);
      setCurrentRecordingSaved(true);
      await loadLibrary();

      // Mostra feedback
      setSaveMessage('Salvato!');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      console.error('Errore salvataggio manuale:', err);
      setSaveMessage('Errore nel salvataggio');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }, [recordedVideo, currentRecordingSaved, currentSession, selectedTrackId, tracks, generateFragmentName, loadLibrary, recordingDuration]);

  // Elimina brano
  const handleDeleteTrack = useCallback(async (trackId) => {
    if (!confirm('Eliminare questo brano e tutti i suoi frammenti?')) return;
    try {
      await deleteTrack(trackId);
      if (currentSession?.trackId === trackId) {
        setCurrentSession(null);
        setShowSessionPicker(true);
      }
      await loadLibrary();
    } catch (err) {
      console.error('Errore eliminazione brano:', err);
    }
  }, [currentSession, loadLibrary]);

  // Elimina frammento
  const handleDeleteFragment = useCallback(async (fragmentId) => {
    if (!confirm('Eliminare questo frammento e tutti i suoi take?')) return;
    try {
      await deleteFragment(fragmentId);
      // Se la sessione corrente era questo frammento, resettala
      if (currentSession?.fragmentId === fragmentId) {
        setCurrentSession(null);
        setShowSessionPicker(true);
      }
      await loadLibrary();
    } catch (err) {
      console.error('Errore eliminazione brano:', err);
    }
  }, [currentSession, loadLibrary]);

  // Elimina take
  const handleDeleteTake = useCallback(async (takeId) => {
    try {
      await deleteTake(takeId);
      setTakeCount(prev => Math.max(0, prev - 1));
      await loadLibrary();
    } catch (err) {
      console.error('Errore eliminazione take:', err);
    }
  }, [loadLibrary]);

  // Inizia rinomina
  const startEditing = useCallback((type, id, currentName) => {
    setEditingItem({ type, id });
    setEditingName(currentName);
  }, []);

  // Annulla rinomina
  const cancelEditing = useCallback(() => {
    setEditingItem(null);
    setEditingName('');
  }, []);

  // Salva rinomina
  const saveEditing = useCallback(async () => {
    if (!editingItem || !editingName.trim()) {
      cancelEditing();
      return;
    }

    try {
      switch (editingItem.type) {
        case 'author':
          await renameAuthor(editingItem.id, editingName);
          // Aggiorna sessione se necessario
          if (currentSession?.authorId === editingItem.id) {
            const updatedSession = { ...currentSession, authorName: editingName.trim() };
            setCurrentSession(updatedSession);
            saveCurrentSession(updatedSession);
          }
          break;
        case 'opera':
          await renameOpera(editingItem.id, editingName);
          if (currentSession?.operaId === editingItem.id) {
            const updatedSession = { ...currentSession, operaName: editingName.trim() };
            setCurrentSession(updatedSession);
            saveCurrentSession(updatedSession);
          }
          break;
        case 'track':
          await renameTrack(editingItem.id, editingName);
          if (currentSession?.trackId === editingItem.id) {
            const updatedSession = { ...currentSession, trackName: editingName.trim() };
            setCurrentSession(updatedSession);
            saveCurrentSession(updatedSession);
          }
          break;
        case 'fragment':
          await renameFragment(editingItem.id, editingName);
          if (currentSession?.fragmentId === editingItem.id) {
            const updatedSession = { ...currentSession, fragmentName: editingName.trim() };
            setCurrentSession(updatedSession);
            saveCurrentSession(updatedSession);
          }
          break;
        case 'take':
          await renameTake(editingItem.id, editingName);
          break;
      }
      await loadLibrary();
    } catch (err) {
      console.error('Errore rinomina:', err);
    }
    cancelEditing();
  }, [editingItem, editingName, currentSession, loadLibrary, cancelEditing]);

  // Play take dalla libreria
  const playTakeFromLibrary = useCallback((take, index, fragmentName) => {
    const url = URL.createObjectURL(take.videoBlob);
    setPlayingTake({ url, mimeType: take.mimeType, index, fragmentName });
  }, []);

  // Chiudi player take
  const closePlayingTake = useCallback(() => {
    if (playingTake?.url) {
      URL.revokeObjectURL(playingTake.url);
    }
    setPlayingTake(null);
  }, [playingTake]);

  // Condividi take dalla libreria
  const shareTakeFromLibrary = useCallback(async (take, takeName) => {
    try {
      const isVideo = take.mimeType?.startsWith('video');
      const extension = isVideo ? 'webm' : 'webm';
      const fileName = `${takeName || 'take'}.${extension}`;

      const file = new File([take.videoBlob], fileName, { type: take.mimeType });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: takeName || 'Take',
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(take.videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Errore condivisione:', err);
      }
    }
  }, []);

  // ============================================
  // MEDIA INITIALIZATION (Audio or Video+Audio)
  // ============================================
  const initMedia = useCallback(async (facing = facingMode, currentOrientation = orientation, shouldPlaySound = true, withVideo = videoEnabled) => {
    try {
      // Stop existing streams
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }

      // Audio hi-fi per interfacce professionali (Motu M2, etc.)
      // Disabilita TUTTI i processing DSP che causano loopback su iOS
      const audioConstraints = {
        autoGainControl: false,
        echoCancellation: false,
        noiseSuppression: false,
        sampleRate: { ideal: 48000 },
        channelCount: { ideal: 2 },
        latency: { ideal: 0 },
        googEchoCancellation: false,
        googAutoGainControl: false,
        googNoiseSuppression: false,
        googHighpassFilter: false
      };

      let mediaStream;

      if (withVideo) {
        // Video + Audio mode
        const isLandscape = currentOrientation === 'landscape';
        const constraints = {
          video: {
            facingMode: facing,
            width: { ideal: isLandscape ? 1280 : 720 },
            height: { ideal: isLandscape ? 720 : 1280 }
          },
          audio: audioConstraints
        };

        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e) {
          // Fallback: prova senza specificare facingMode
          const fallbackConstraints = {
            video: {
              width: { ideal: isLandscape ? 1280 : 720 },
              height: { ideal: isLandscape ? 720 : 1280 }
            },
            audio: audioConstraints
          };
          mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        }

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = mediaStream;
        }
      } else {
        // Audio-only mode
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: audioConstraints
        });
      }

      setStream(mediaStream);
      audioStreamRef.current = mediaStream;

      setError(null);
      setIsInitialized(true);
      if (shouldPlaySound) {
        playReadySound();
      }
    } catch (err) {
      console.error('Media init error:', err);
      setError(withVideo
        ? 'Impossibile accedere alla fotocamera. Verifica i permessi.'
        : 'Impossibile accedere al microfono. Verifica i permessi.');
    }
  }, [stream, facingMode, orientation, playReadySound, videoEnabled]);

  // Alias for backward compatibility
  const initCamera = initMedia;

  // ============================================
  // RECORDING FUNCTIONS
  // ============================================
  const startRecording = useCallback(async () => {
    if (!stream || isRecordingRef.current) {
      return;
    }

    // Se c'è un MediaRecorder precedente attivo, aspetta che si fermi
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('MediaRecorder precedente attivo, attendo...');
      await new Promise(resolve => {
        mediaRecorderRef.current.onstop = resolve;
        mediaRecorderRef.current.stop();
      });
    }
    mediaRecorderRef.current = null;

    // IMPORTANTE: Sospendi AudioContext per evitare qualsiasi output audio durante registrazione
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend();
    }

    chunksRef.current = [];
    setRecordedVideo(null);
    setRecordedMedia(null);

    // Usa lo stream originale senza processing per massima qualità audio
    const recordingStream = stream;

    // Seleziona mime type in base alla modalità
    let mimeTypes;
    if (videoEnabled) {
      // Video + Audio: preferisci MP4 per compatibilità con QuickTime/iOS
      mimeTypes = [
        'video/mp4;codecs=avc1.424028,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm'
      ];
    } else {
      // Audio only: preferisci formati audio
      mimeTypes = [
        'audio/mp4',
        'audio/aac',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg'
      ];
    }

    let selectedMimeType = '';
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        break;
      }
    }

    // Verifica che lo stream abbia tracce attive
    const tracks = recordingStream.getTracks();
    if (tracks.length === 0 || tracks.every(t => t.readyState !== 'live')) {
      console.error('Stream non ha tracce attive');
      setError('Stream audio/video non disponibile. Ricarica la pagina.');
      return;
    }

    // Crea MediaRecorder con fallback progressivo
    const createRecorder = () => {
      // Prima prova con mime type e opzioni
      if (selectedMimeType) {
        try {
          const options = videoEnabled ? {
            mimeType: selectedMimeType,
            audioBitsPerSecond: 128000,
            videoBitsPerSecond: 2000000
          } : {
            mimeType: selectedMimeType,
            audioBitsPerSecond: 128000
          };
          return new MediaRecorder(recordingStream, options);
        } catch (e) {
          console.warn('MediaRecorder con opzioni fallito:', e);
        }

        // Prova solo con mime type
        try {
          return new MediaRecorder(recordingStream, { mimeType: selectedMimeType });
        } catch (e) {
          console.warn('MediaRecorder con mimeType fallito:', e);
        }
      }

      // Fallback: default del browser
      return new MediaRecorder(recordingStream);
    };

    try {
      mediaRecorderRef.current = createRecorder();
    } catch (e) {
      console.error('Impossibile creare MediaRecorder:', e);
      setError('Impossibile avviare la registrazione. Prova a ricaricare la pagina.');
      return;
    }

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = async () => {
      // Se è un discard, non creare il media
      if (isDiscardingRef.current) {
        isDiscardingRef.current = false;
        return;
      }

      const mimeType = mediaRecorderRef.current.mimeType || (videoEnabled ? 'video/webm' : 'audio/webm');
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);

      // Store in both states for compatibility
      setRecordedVideo({ url, blob, mimeType });
      setRecordedMedia({ url, blob, mimeType, isVideo: videoEnabled });
      setIsPlaying(false);
      setCurrentRecordingSaved(false); // Reset per nuova registrazione
    };

    try {
      mediaRecorderRef.current.start(100);
    } catch (e) {
      // Controlla se nonostante l'errore il recorder è partito
      if (mediaRecorderRef.current.state !== 'recording') {
        console.error('Errore avvio MediaRecorder:', e);
        setError('Errore avvio registrazione. Prova a ricaricare la pagina.');
        return;
      }
      // Se è in recording, ignora l'eccezione
    }
    setIsRecording(true);
    setCurrentRecordingSaved(false); // Reset all'inizio della registrazione
    startTimer(); // Avvia il timer
    playRecordingSound();
  }, [stream, videoEnabled, playRecordingSound, startTimer]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // Richiedi gli ultimi dati prima di stoppare
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer(); // Ferma il timer
    }
  }, [stopTimer]);

  // Spegni la camera quando il video è pronto
  useEffect(() => {
    if (recordedVideo && stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsInitialized(false);
    }
  }, [recordedVideo]);

  // Reinizializza quando cambia la modalità video/audio
  useEffect(() => {
    if (isInitialized && !isRecording && !recordedVideo) {
      initMedia(facingMode, orientation, false, videoEnabled);
    }
  }, [videoEnabled]);

  // PEDALE SINISTRO: Start registrazione, o Discard se già in corso
  const handleLeftPedal = useCallback(async () => {
    // Se sta registrando, fa discard e si ferma (pronto per nuova registrazione)
    if (isRecordingRef.current) {
      // Setta il flag di discard PRIMA di stoppare
      isDiscardingRef.current = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      resetTimer(); // Reset del timer
      chunksRef.current = [];
      playReadySound(); // Suono "pronto" - tornato in attesa
      return;
    }

    // Se c'è un video registrato, scartalo e torna alla camera (ready)
    if (recordedVideo) {
      if (recordedVideo.url) {
        URL.revokeObjectURL(recordedVideo.url);
      }
      setRecordedVideo(null);
      setIsPlaying(false);
      resetTimer(); // Reset del timer
      // Reinizializza la camera - il suono "ready" verrà emesso da initCamera
      await initCamera();
      return;
    }

    // Se siamo pronti (stream attivo), inizia a registrare
    // In modalità audio-only non ci sono video tracks, quindi controlliamo audio tracks
    const hasActiveTracks = stream && (
      videoEnabled
        ? !stream.getVideoTracks().every(t => t.readyState === 'ended')
        : !stream.getAudioTracks().every(t => t.readyState === 'ended')
    );
    if (hasActiveTracks) {
      startRecording();
    }
  }, [recordedVideo, startRecording, stream, initCamera, playReadySound, videoEnabled, resetTimer]);

  // PEDALE DESTRO: Stop registrazione, oppure Accept (salva) se c'è video registrato
  const handleRightPedal = useCallback(() => {
    // Se sta registrando, stoppa
    if (isRecordingRef.current) {
      stopRecording();
      // Il suono "playing" verrà emesso quando il video inizia a riprodurre (onPlay)
      return;
    }
    // Se c'è un video registrato, salva (accept)
    if (recordedVideo && !currentRecordingSaved) {
      handleManualSave();
    }
  }, [stopRecording, recordedVideo, currentRecordingSaved, handleManualSave]);

  // Play/Pause senza beep (per pulsante UI)
  const togglePlayPause = useCallback(() => {
    if (!videoPlaybackRef.current || !recordedVideo) return;

    if (videoPlaybackRef.current.paused) {
      videoPlaybackRef.current.play().catch(() => {});
    } else {
      videoPlaybackRef.current.pause();
    }
  }, [recordedVideo]);

  const resetRecording = () => {
    if (recordedVideo?.url) {
      URL.revokeObjectURL(recordedVideo.url);
    }
    setRecordedVideo(null);
    setIsPlaying(false);
  };

  const shareVideo = async () => {
    if (!recordedVideo) return;
    const ext = recordedVideo.mimeType?.includes('mp4') ? 'mp4' : 'webm';
    const filename = `video-${Date.now()}.${ext}`;

    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([recordedVideo.blob], filename, { type: recordedVideo.mimeType });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Video registrato'
          });
        } else {
          // Fallback: apri in nuova tab
          window.open(recordedVideo.url, '_blank');
        }
      } catch (e) {
        // User cancelled o errore
        if (e.name !== 'AbortError') {
          window.open(recordedVideo.url, '_blank');
        }
      }
    } else {
      // Browser non supporta share, apri in nuova tab
      window.open(recordedVideo.url, '_blank');
    }
  };

  // ============================================
  // KEYBOARD / PEDAL SUPPORT
  // Molti pedali USB emulano una tastiera e inviano
  // keypress configurabili (Space, PageDown, ecc.)
  // ============================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Se stiamo configurando il pedale sinistro
      if (isListeningForKey === 'left') {
        e.preventDefault();
        setLeftPedalKey(e.key);
        setIsListeningForKey(null);
        setLastInput(`Pedale SX configurato: "${e.key === ' ' ? 'Spazio' : e.key}"`);
        return;
      }

      // Se stiamo configurando il pedale destro
      if (isListeningForKey === 'right') {
        e.preventDefault();
        setRightPedalKey(e.key);
        setIsListeningForKey(null);
        setLastInput(`Pedale DX configurato: "${e.key === ' ' ? 'Spazio' : e.key}"`);
        return;
      }

      // Controlla pedale sinistro (registrazione)
      if (e.key === leftPedalKey) {
        e.preventDefault();
        setLastInput(`Pedale SX: REC`);
        setControllerStatus({ type: 'keyboard', name: 'Pedale USB' });
        handleLeftPedal();
      }

      // Controlla pedale destro (play/pause)
      if (e.key === rightPedalKey) {
        e.preventDefault();
        setLastInput(`Pedale DX: PLAY/PAUSE`);
        setControllerStatus({ type: 'keyboard', name: 'Pedale USB' });
        handleRightPedal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [leftPedalKey, rightPedalKey, isListeningForKey, handleLeftPedal, handleRightPedal]);

  // ============================================
  // GAMEPAD API SUPPORT
  // Per pedali che si presentano come controller
  // ============================================
  useEffect(() => {
    const handleGamepadConnected = (e) => {
      setControllerStatus({ type: 'gamepad', name: e.gamepad.id });
      setLastInput('Gamepad connesso!');
    };

    const handleGamepadDisconnected = () => {
      setControllerStatus({ type: null, name: null });
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    // Polling per leggere lo stato del gamepad
    // (i gamepad non generano eventi per i pulsanti)
    let lastButton0State = false;
    let lastButton1State = false;

    gamepadIntervalRef.current = setInterval(() => {
      const gamepads = navigator.getGamepads();
      for (const gamepad of gamepads) {
        if (gamepad) {
          // Pulsante 0 = pedale sinistro (registrazione)
          if (gamepad.buttons[0]) {
            const button0Pressed = gamepad.buttons[0].pressed;
            if (button0Pressed && !lastButton0State) {
              setLastInput(`Gamepad: Pulsante 0 (SX)`);
              handleLeftPedal();
            }
            lastButton0State = button0Pressed;
          }

          // Pulsante 1 = pedale destro (play/pause)
          if (gamepad.buttons[1]) {
            const button1Pressed = gamepad.buttons[1].pressed;
            if (button1Pressed && !lastButton1State) {
              setLastInput(`Gamepad: Pulsante 1 (DX)`);
              handleRightPedal();
            }
            lastButton1State = button1Pressed;
          }
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
  }, [handleLeftPedal, handleRightPedal]);

  // ============================================
  // LIBRARY INITIALIZATION
  // ============================================
  useEffect(() => {
    if (hasUserInteracted) {
      loadOrCreateSession();
    }
  }, [hasUserInteracted, loadOrCreateSession]);

  // ============================================
  // INITIALIZATION & CLEANUP
  // ============================================
  useEffect(() => {
    // Non inizializzare finché l'utente non ha interagito
    if (!hasUserInteracted) return;

    let mounted = true;
    let localStream = null;

    const init = async () => {
      try {
        // Determina orientamento iniziale
        const isLandscape = window.innerWidth > window.innerHeight;
        // Audio hi-fi per interfacce professionali (Motu M2, etc.)
        // Disabilita TUTTI i processing DSP che causano loopback su iOS
        const audioConstraints = {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 2 },
          // Constraints aggiuntivi per iOS/Safari con interfacce esterne
          latency: { ideal: 0 },
          // Forza input senza monitoring
          googEchoCancellation: false,
          googAutoGainControl: false,
          googNoiseSuppression: false,
          googHighpassFilter: false
        };

        const constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: isLandscape ? 1280 : 720 },
            height: { ideal: isLandscape ? 720 : 1280 }
          },
          audio: audioConstraints
        };

        let mediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e) {
          // Fallback: prova senza specificare facingMode (usa qualsiasi camera)
          const fallbackConstraints = {
            video: {
              width: { ideal: isLandscape ? 1280 : 720 },
              height: { ideal: isLandscape ? 720 : 1280 }
            },
            audio: audioConstraints
          };
          mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        }
        localStream = mediaStream;

        if (!mounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        setStream(mediaStream);

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = mediaStream;
        }

        setError(null);
        setIsInitialized(true);
        // Suono "ready" quando la camera è pronta
        playReadySound();
      } catch (err) {
        if (mounted) {
          setError('Impossibile accedere alla fotocamera. Verifica i permessi.');
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [hasUserInteracted]);

  // ============================================
  // PINCH TO ZOOM CAMERA
  // ============================================
  useEffect(() => {
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const capabilities = videoTrack.getCapabilities?.();
    const hasZoom = capabilities?.zoom;

    const getDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialPinchDistance.current = getDistance(e.touches);
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && initialPinchDistance.current && hasZoom) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches);
        const scale = currentDistance / initialPinchDistance.current;

        const minZoom = capabilities.zoom.min || 1;
        const maxZoom = capabilities.zoom.max || 10;

        let newZoom = currentZoom.current * scale;
        newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

        videoTrack.applyConstraints({ advanced: [{ zoom: newZoom }] }).catch(() => {});

        currentZoom.current = newZoom;
        initialPinchDistance.current = currentDistance;
      }
    };

    const handleTouchEnd = () => {
      initialPinchDistance.current = null;
    };

    const container = videoContainerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd);

      return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [stream]);

  // ============================================
  // ORIENTATION CHANGE HANDLER
  // ============================================
  useEffect(() => {
    const handleOrientationChange = () => {
      const newOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';

      if (newOrientation !== orientation) {
        setOrientation(newOrientation);

        // Se la camera è attiva e non stiamo registrando, reinizializza con nuove dimensioni
        // Passa playSound=false per non emettere suono durante rotazione
        if (stream && !isRecordingRef.current) {
          initCamera(facingMode, newOrientation, false);
        }
      }
    };

    const handleOrientationChangeDelayed = () => {
      // Piccolo delay perché le dimensioni potrebbero non essere aggiornate immediatamente
      setTimeout(handleOrientationChange, 100);
    };

    // Usa resize event che funziona meglio cross-browser
    window.addEventListener('resize', handleOrientationChange);

    // Anche orientationchange per dispositivi mobili
    window.addEventListener('orientationchange', handleOrientationChangeDelayed);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChangeDelayed);
    };
  }, [orientation, stream, facingMode, initCamera]);

  // Funzione per switchare camera (front/back) - DEVE essere definita prima del return condizionale
  const switchCamera = useCallback(() => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    initCamera(newFacing, orientation, false, videoEnabled);
  }, [facingMode, stream, orientation, videoEnabled, initCamera]);

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

  // Splash screen - richiede interazione utente per attivare audio/video
  if (!hasUserInteracted) {
    return (
      <div
        className="fixed inset-0 bg-black flex flex-col items-center justify-center cursor-pointer overflow-hidden touch-none"
        onClick={() => setHasUserInteracted(true)}
      >
        <Video className="w-24 h-24 text-red-500 mb-8" />
        <h1 className="text-white text-3xl font-bold mb-4">QuickVideo</h1>
        <p className="text-gray-400 text-lg mb-8">Video Recorder con Pedali</p>
        <div className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-full text-xl font-semibold transition-colors">
          Tocca per iniziare
        </div>
        <p className="text-gray-500 text-sm mt-8 max-w-xs text-center">
          Tocca lo schermo per attivare la fotocamera e i controlli remoti
        </p>
      </div>
    );
  }

  // Formatta timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  };

  // Formatta durata breve per lista take (es: "1:23" o "0:45")
  const formatTakeDuration = (seconds) => {
    if (!seconds || seconds === 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcola il numero totale di take ricorsivamente
  const countTotalTakes = (item) => {
    if (item.takes) {
      return item.takes.length;
    }
    if (item.fragments) {
      return item.fragments.reduce((sum, f) => sum + (f.takes?.length || 0), 0);
    }
    if (item.tracks) {
      return item.tracks.reduce((sum, t) => sum + countTotalTakes(t), 0);
    }
    if (item.operas) {
      return item.operas.reduce((sum, o) => sum + countTotalTakes(o), 0);
    }
    return 0;
  };

  // Handler per selezione sessione da SessionsTab
  const handleSelectSessionFromTab = async (session) => {
    setCurrentSession(session);
    await saveCurrentSession(session);
    if (session.fragmentId) {
      const takes = await getTakesByFragment(session.fragmentId);
      setTakeCount(takes.length);
    } else if (session.trackId) {
      const takes = await getTakesByTrack(session.trackId);
      setTakeCount(takes.length);
    }
    setActiveTab('registra');
  };

  // Classi tema
  const isDark = settings.theme === 'dark';
  const themeClasses = isDark
    ? 'bg-black text-white'
    : 'bg-gray-100 text-gray-900';

  return (
    <div className={`fixed inset-0 flex flex-col overflow-hidden ${themeClasses}`}>
      {/* Contenuto principale con padding per tab bar */}
      <div className="flex-1 relative overflow-hidden pb-28">
        {/* Tab Registra */}
        {activeTab === 'registra' && (
          <>
            {/* Header compatto: sessione + toggle + REC in una riga */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gray-900/90 backdrop-blur-sm px-2 py-1.5">
          <div className="flex items-center gap-2">
            {/* Sessione (sinistra) */}
            {!isRecording && currentSession ? (
              <button
                onClick={openSessionPicker}
                className="flex-1 flex items-center gap-2 bg-gray-800/80 rounded-lg px-2 py-1 active:bg-gray-700 overflow-hidden min-w-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">
                    {currentSession.trackName}
                  </p>
                  {currentSession.fragmentName && (
                    <p className="text-gray-400 text-[10px] truncate">{currentSession.fragmentName}</p>
                  )}
                </div>
                <div className="bg-green-600 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{takeCount}</span>
                </div>
              </button>
            ) : !isRecording && !showSessionPicker ? (
              <button
                onClick={openSessionPicker}
                className="flex items-center gap-1 bg-yellow-600/90 rounded-lg px-2 py-1"
              >
                <Plus className="w-4 h-4 text-white" />
                <span className="text-white text-xs font-medium">Sessione</span>
              </button>
            ) : isRecording && (
              <div className="flex-1 flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white text-sm font-mono font-bold">{formatDuration(recordingDuration)}</span>
              </div>
            )}

            {/* Toggle Video/Audio (centro) - solo quando non registra e non c'è video registrato */}
            {!isRecording && !recordedVideo && (
              <div className="flex-shrink-0 bg-gray-800 rounded-full p-1 flex">
                <button
                  onClick={() => setVideoEnabled(true)}
                  className={`p-2.5 rounded-full transition-colors ${
                    videoEnabled ? 'bg-blue-600 text-white' : 'text-gray-400'
                  }`}
                >
                  <Video className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setVideoEnabled(false)}
                  className={`p-2.5 rounded-full transition-colors ${
                    !videoEnabled ? 'bg-orange-600 text-white' : 'text-gray-400'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Pulsante REC (destra) - nascosto quando c'è video registrato */}
            {!recordedVideo && (
              <button
                onClick={() => {
                  if (isRecording) {
                    stopRecording();
                  } else {
                    startRecording();
                    playRecordingSound();
                  }
                }}
                disabled={!isInitialized && !isRecording}
                className="flex-shrink-0"
              >
                <div className={`w-12 h-12 rounded-full border-2 border-white flex items-center justify-center ${
                  !isInitialized && !isRecording ? 'opacity-50' : ''
                } ${isRecording ? 'bg-red-600' : 'bg-black/50'}`}>
                  {isRecording ? (
                    <Square className="w-5 h-5 text-white fill-white" />
                  ) : (
                    <Circle className="w-7 h-7 text-red-500 fill-red-500" />
                  )}
                </div>
              </button>
            )}
          </div>
        </div>



      {/* Controller Panel Modal */}
      {showControllerPanel && (
        <div
          className="absolute inset-0 z-50 bg-black/90 flex items-start justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            // Chiudi se si clicca sullo sfondo (non sul contenuto)
            if (e.target === e.currentTarget) {
              setShowControllerPanel(false);
            }
          }}
        >
          <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full my-auto relative">
            {/* Pulsante X grande in alto a destra */}
            <button
              onClick={() => setShowControllerPanel(false)}
              className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg active:bg-red-700"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-white" />
              <h2 className="text-white text-lg font-semibold">Controller Setup</h2>
            </div>

            {/* Keyboard/Pedal Section */}
            <div className="mb-6">
              <h3 className="text-gray-400 text-sm mb-3 flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                Pedali USB / Tastiera
              </h3>
              <p className="text-gray-500 text-xs mb-3">
                Configura i due pedali: sinistro per registrare, destro per play/pause.
              </p>

              {/* Pedale Sinistro */}
              <div className="mb-3">
                <label className="text-gray-400 text-xs mb-1 block">Pedale SINISTRO (Rec/Restart)</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-800 rounded-lg p-3 text-center">
                    <span className="text-red-400 font-mono text-lg">
                      {getKeyDisplayName(leftPedalKey)}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsListeningForKey('left')}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      isListeningForKey === 'left'
                        ? 'bg-yellow-600 text-white animate-pulse'
                        : 'bg-blue-600 text-white hover:bg-blue-500'
                    }`}
                  >
                    {isListeningForKey === 'left' ? 'Premi...' : 'Config'}
                  </button>
                </div>
              </div>

              {/* Pedale Destro */}
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Pedale DESTRO (Play/Pause)</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-800 rounded-lg p-3 text-center">
                    <span className="text-green-400 font-mono text-lg">
                      {getKeyDisplayName(rightPedalKey)}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsListeningForKey('right')}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      isListeningForKey === 'right'
                        ? 'bg-yellow-600 text-white animate-pulse'
                        : 'bg-blue-600 text-white hover:bg-blue-500'
                    }`}
                  >
                    {isListeningForKey === 'right' ? 'Premi...' : 'Config'}
                  </button>
                </div>
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

            {/* Audio Feedback Toggle - IMPORTANTE per evitare loopback */}
            <div className="mb-6">
              <h3 className="text-gray-400 text-sm mb-3 flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Audio Feedback
              </h3>
              <div className="bg-gray-800 rounded-lg p-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-white text-sm">Suoni di feedback</span>
                    <p className="text-gray-500 text-xs mt-1">
                      Disattiva se usi interfacce audio esterne (Motu, Focusrite, etc.)
                    </p>
                  </div>
                  <button
                    onClick={() => setAudioFeedbackEnabled(!audioFeedbackEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      audioFeedbackEnabled ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      audioFeedbackEnabled ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </label>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4">
              <h4 className="text-blue-400 text-sm font-medium mb-2">Come funziona</h4>
              <ul className="text-blue-300/80 text-xs space-y-1">
                <li>• <strong>Pedale SX:</strong> Avvia/Riavvia registrazione (scarta video precedente)</li>
                <li>• <strong>Pedale DX:</strong> Play/Pause del video registrato</li>
                <li>• Ogni pressione produce un suono diverso come feedback</li>
                <li>• Pedali USB: di solito usano frecce o Spazio/PageDown</li>
                <li>• Gamepad: pulsante 0 (SX) e 1 (DX) rilevati automaticamente</li>
              </ul>
            </div>

            {/* Avviso Loopback */}
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mt-4">
              <h4 className="text-yellow-400 text-sm font-medium mb-2">Interfacce Audio Esterne</h4>
              <p className="text-yellow-300/80 text-xs">
                Se usi un'interfaccia audio professionale (Motu M2, Focusrite, etc.) e noti
                loopback/feedback, disattiva i "Suoni di feedback" sopra. L'app non invia
                audio all'output durante la registrazione.
              </p>
            </div>

            <button
              onClick={() => setShowControllerPanel(false)}
              className="w-full mt-6 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl active:bg-blue-700 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Session Picker Modal */}
      {showSessionPicker && (
        <div
          className="absolute inset-0 z-50 bg-black/95 flex flex-col pt-4 px-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && currentSession) {
              setShowSessionPicker(false);
            }
          }}
        >
          <div className="bg-gray-900 rounded-2xl p-5 max-w-sm w-full mx-auto relative">
            {currentSession && (
              <button
                onClick={() => setShowSessionPicker(false)}
                className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg active:bg-red-700"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            )}

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-purple-400" />
                <h2 className="text-white text-sm font-semibold">Sessione</h2>
              </div>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-2 text-gray-400 active:text-white"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs Recenti / Nuovo */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setSessionPickerTab('recenti');
                  loadRecentSessionsData(true);
                }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  sessionPickerTab === 'recenti'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                Recenti
              </button>
              <button
                onClick={() => setSessionPickerTab('nuovo')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  sessionPickerTab === 'nuovo'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                Nuovo
              </button>
            </div>

            {/* Tab Recenti */}
            {sessionPickerTab === 'recenti' && (
              <div className="space-y-3 mb-4">
                {/* Campo ricerca */}
                <input
                  type="text"
                  value={recentSessionsSearch}
                  onChange={(e) => handleRecentSessionsSearch(e.target.value)}
                  placeholder="Cerca sessione..."
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
                />

                {/* Lista sessioni recenti */}
                <div className="max-h-[50vh] overflow-y-auto space-y-2">
                  {recentSessions.length === 0 && !recentSessionsLoading ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      Nessuna sessione recente
                    </p>
                  ) : (
                    recentSessions.map((entry) => {
                      const s = entry.session;
                      const isActive = currentSession &&
                        currentSession.trackId === s.trackId &&
                        currentSession.fragmentId === s.fragmentId;

                      return (
                        <button
                          key={entry.id}
                          onClick={() => {
                            selectFragmentAsSession(
                              s.fragmentId ? { id: s.fragmentId, name: s.fragmentName } : null,
                              { id: s.trackId, name: s.trackName },
                              s.operaId ? { id: s.operaId, name: s.operaName } : null,
                              s.authorId ? { id: s.authorId, name: s.authorName } : null,
                              false // Non chiudere il picker
                            );
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-green-900/40 border-2 border-green-500'
                              : 'bg-gray-800 active:bg-gray-700'
                          }`}
                        >
                          <div className="text-left flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isActive ? 'text-green-300' : 'text-white'}`}>
                              {s.fragmentName || s.trackName}
                            </p>
                            <p className={`text-xs truncate ${isActive ? 'text-green-400/70' : 'text-gray-400'}`}>
                              {[
                                s.authorName,
                                s.operaName,
                                s.fragmentName ? s.trackName : null
                              ].filter(Boolean).join(' > ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            {isActive && (
                              <span className="text-green-400 text-[10px] font-medium uppercase">Attiva</span>
                            )}
                            <span className="text-gray-500 text-xs">
                              {formatTimeAgo(entry.lastUsed)}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}

                  {/* Carica altri */}
                  {hasMoreRecent && !recentSessionsSearch && (
                    <button
                      onClick={() => loadRecentSessionsData(false)}
                      disabled={recentSessionsLoading}
                      className="w-full py-2 text-purple-400 text-sm"
                    >
                      {recentSessionsLoading ? 'Caricamento...' : 'Carica altri'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tab Nuovo - Help/Hint Panel */}
            {sessionPickerTab === 'nuovo' && showHelp && (
              <div className="bg-blue-900/40 border border-blue-700 rounded-lg p-3 mb-4">
                <h4 className="text-blue-300 text-xs font-semibold mb-2">Come organizzare i video:</h4>
                <div className="text-blue-200/80 text-xs space-y-2">
                  <p><strong className="text-cyan-300">Autore</strong> (opzionale): es. "Chopin"</p>
                  <p><strong className="text-yellow-300">Opera</strong> (opzionale): es. "Etudes Op. 10"</p>
                  <p><strong className="text-purple-300">Brano</strong>: es. "Studio n.4" o "Primo movimento"</p>
                  <p><strong className="text-green-300">Frammento</strong>: es. "Battute 5-7" o "Pagina 2"</p>
                  <p className="text-gray-400 mt-2 pt-2 border-t border-blue-700">
                    Tutti i take registrati finiranno nel frammento selezionato.
                  </p>
                </div>
              </div>
            )}

            {/* Tab Nuovo - Form creazione */}
            {sessionPickerTab === 'nuovo' && (
              <>
                {/* Sezione Autore (opzionale) - SELECT */}
                <div className="mb-3">
                  <label className="text-cyan-400 text-xs mb-1 block flex items-center gap-1">
                    <User className="w-3 h-3" />
                Autore <span className="text-gray-500">(opzionale)</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedAuthorId || ''}
                  onChange={(e) => {
                    setSelectedAuthorId(e.target.value || null);
                    setSelectedOperaId(null);
                    setSelectedTrackId(null);
                  }}
                  className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">-- Nessun autore --</option>
                  {authors.map(author => (
                    <option key={author.id} value={author.id}>{author.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const name = prompt('Nome autore (es. Chopin):');
                    if (name?.trim()) {
                      handleCreateAuthor(name.trim());
                    }
                  }}
                  className="px-3 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium active:bg-cyan-700"
                  title="Nuovo autore"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sezione Opera (opzionale) - SELECT */}
            <div className="mb-3">
              <label className="text-yellow-400 text-xs mb-1 block flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Opera <span className="text-gray-500">(opzionale)</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedOperaId || ''}
                  onChange={(e) => {
                    setSelectedOperaId(e.target.value || null);
                    setSelectedTrackId(null);
                  }}
                  className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">-- Nessuna opera --</option>
                  {operas
                    .filter(opera => !selectedAuthorId || opera.authorId === selectedAuthorId)
                    .map(opera => (
                      <option key={opera.id} value={opera.id}>{opera.name}</option>
                    ))}
                </select>
                <button
                  onClick={() => {
                    const name = prompt('Nome opera (es. Etudes Op. 10):');
                    if (name?.trim()) {
                      handleCreateOpera(selectedAuthorId, name.trim());
                    }
                  }}
                  className="px-3 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium active:bg-yellow-700"
                  title="Nuova opera"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sezione Brano - SELECT */}
            <div className="mb-3">
              <label className="text-purple-400 text-xs mb-1 block flex items-center gap-1">
                <FolderOpen className="w-3 h-3" />
                Brano
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedTrackId || ''}
                  onChange={(e) => setSelectedTrackId(e.target.value || null)}
                  className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Seleziona brano --</option>
                  {tracks
                    .filter(track => !selectedOperaId || track.operaId === selectedOperaId)
                    .map(track => (
                      <option key={track.id} value={track.id}>{track.name}</option>
                    ))}
                </select>
                <button
                  onClick={() => {
                    const name = prompt('Nome brano (es. Studio n.4):');
                    if (name?.trim()) {
                      handleCreateTrack(selectedOperaId, name.trim());
                    }
                  }}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium active:bg-purple-700"
                  title="Nuovo brano"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sezione Frammento */}
            <div className="mb-3">
              <label className="text-green-400 text-xs mb-1 block flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Frammento
              </label>
              {selectedTrackId ? (
                <>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newFragmentName}
                      onChange={(e) => setNewFragmentName(e.target.value)}
                      placeholder="es. Battute 5-7, Pagina 2"
                      className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm placeholder-gray-500 outline-none focus:ring-2 focus:ring-green-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newFragmentName.trim()) {
                          const track = tracks.find(t => t.id === selectedTrackId);
                          const opera = operas.find(o => o.id === selectedOperaId);
                          const author = authors.find(a => a.id === selectedAuthorId);
                          handleCreateFragment(
                            selectedTrackId,
                            track?.name,
                            selectedOperaId,
                            opera?.name,
                            selectedAuthorId,
                            author?.name
                          );
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const track = tracks.find(t => t.id === selectedTrackId);
                        const opera = operas.find(o => o.id === selectedOperaId);
                        const author = authors.find(a => a.id === selectedAuthorId);
                        handleCreateFragment(
                          selectedTrackId,
                          track?.name,
                          selectedOperaId,
                          opera?.name,
                          selectedAuthorId,
                          author?.name
                        );
                      }}
                      disabled={!newFragmentName.trim()}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 active:bg-green-700"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  {/* Lista frammenti esistenti per questo brano */}
                  <div className="max-h-32 overflow-y-auto space-y-1 bg-gray-800/30 rounded-lg p-2">
                    {(() => {
                      // Trova i frammenti del brano selezionato
                      const fragments = [];
                      for (const item of library) {
                        if (item.type === 'author') {
                          for (const opera of (item.operas || [])) {
                            for (const track of (opera.tracks || [])) {
                              if (track.id === selectedTrackId) {
                                for (const fragment of (track.fragments || [])) {
                                  fragments.push({ fragment, track, opera, author: item });
                                }
                              }
                            }
                          }
                        } else if (item.type === 'opera') {
                          for (const track of (item.tracks || [])) {
                            if (track.id === selectedTrackId) {
                              for (const fragment of (track.fragments || [])) {
                                fragments.push({ fragment, track, opera: item, author: null });
                              }
                            }
                          }
                        } else if (item.type === 'track' && item.id === selectedTrackId) {
                          for (const fragment of (item.fragments || [])) {
                            fragments.push({ fragment, track: item, opera: null, author: null });
                          }
                        }
                      }

                      if (fragments.length === 0) {
                        return (
                          <p className="text-gray-500 text-xs text-center py-2">
                            Nessun frammento. Creane uno sopra.
                          </p>
                        );
                      }

                      return fragments.map(({ fragment, track, opera, author }) => (
                        <button
                          key={fragment.id}
                          onClick={() => selectFragmentAsSession(fragment, track, opera, author)}
                          className={`w-full flex items-center justify-between p-2 rounded text-sm ${
                            currentSession?.fragmentId === fragment.id
                              ? 'bg-green-600/40 border border-green-500'
                              : 'bg-gray-700 active:bg-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-green-400" />
                            <span className="text-white">{fragment.name}</span>
                          </div>
                          <span className="text-gray-400 text-xs">{fragment.takes?.length || 0} take</span>
                        </button>
                      ));
                    })()}
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm bg-gray-800 rounded-lg p-3 text-center">
                  Seleziona prima un brano
                </p>
              )}
            </div>

            {/* Pulsante Salta frammento */}
            {selectedTrackId && (
              <button
                onClick={() => {
                  const track = tracks.find(t => t.id === selectedTrackId);
                  const opera = operas.find(o => o.id === selectedOperaId);
                  const author = authors.find(a => a.id === selectedAuthorId);
                  selectTrackAsSession(track, opera, author);
                }}
                className="w-full mt-2 py-2 px-3 bg-gray-700 border border-dashed border-gray-500 rounded-lg text-gray-300 text-sm active:bg-gray-600"
              >
                Salta frammento (registra direttamente nel brano)
              </button>
            )}

            {/* Percorso attuale */}
            <div className="mb-3 mt-3 bg-gray-800/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Percorso:</p>
              <p className="text-white text-sm">
                {[
                  selectedAuthorId && authors.find(a => a.id === selectedAuthorId)?.name,
                  selectedOperaId && operas.find(o => o.id === selectedOperaId)?.name,
                  selectedTrackId && tracks.find(t => t.id === selectedTrackId)?.name
                ].filter(Boolean).join(' > ') || <span className="text-gray-500">Nessuna selezione</span>}
              </p>
            </div>
              </>
            )}

            {/* Avviso quando non c'è sessione */}
            {!currentSession && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-2">
                <p className="text-yellow-300 text-xs text-center">
                  Seleziona una sessione per iniziare a registrare
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Library Modal */}
      {showLibrary && (
        <div
          className="absolute inset-0 z-50 bg-black/95 flex items-start justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLibrary(false);
              setPlayingTakeUrl(null);
            }
          }}
        >
          <div className="bg-gray-900 rounded-2xl p-5 max-w-md w-full my-auto relative">
            <button
              onClick={() => {
                setShowLibrary(false);
                setPlayingTakeUrl(null);
              }}
              className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg active:bg-red-700"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="w-5 h-5 text-purple-400" />
              <h2 className="text-white text-lg font-semibold">Libreria</h2>
              <span className="text-gray-500 text-xs">({library.length} elementi)</span>
            </div>


            {/* Lista libreria - Autore > Opera > Brano > Frammento > Takes */}
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {library.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Libreria vuota.</p>
                  <p className="text-gray-600 text-xs mt-2">Registra e salva qualcosa per vederlo qui.</p>
                  <button
                    onClick={loadLibrary}
                    className="mt-3 text-purple-400 text-xs underline"
                  >
                    Ricarica libreria
                  </button>
                </div>
              ) : (
                library.map((item) => (
                  item.type === 'author' ? (
                    // AUTORE - Livello più alto (cyan)
                    <div key={item.id} className="bg-cyan-900/30 border border-cyan-700/50 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3">
                        {editingItem?.type === 'author' && editingItem?.id === item.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <User className="w-4 h-4 text-cyan-400" />
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              className="flex-1 bg-cyan-800/50 text-cyan-100 text-sm px-2 py-1 rounded border border-cyan-500 outline-none"
                              autoFocus
                            />
                            <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleAuthor(item.id)}
                              className="flex-1 flex items-center gap-2"
                            >
                              {expandedAuthors[item.id] ? (
                                <ChevronDown className="w-4 h-4 text-cyan-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                              <User className="w-4 h-4 text-cyan-400" />
                              <span className="text-cyan-100 text-sm font-medium">{item.name}</span>
                              <span className="text-cyan-500/60 text-xs">({countTotalTakes(item)} take)</span>
                            </button>
                            <button
                              onClick={() => startEditing('author', item.id, item.name)}
                              className="p-3 text-cyan-400 active:text-cyan-300"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAuthor(item.id)}
                              className="p-3 text-red-400 active:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>

                      {expandedAuthors[item.id] && (
                        <div className="px-3 pb-3 space-y-2">
                          {item.operas?.map((opera) => (
                            <div key={opera.id} className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between p-2">
                                {editingItem?.type === 'opera' && editingItem?.id === opera.id ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-yellow-400" />
                                    <input
                                      type="text"
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEditing();
                                        if (e.key === 'Escape') cancelEditing();
                                      }}
                                      className="flex-1 bg-yellow-800/50 text-yellow-100 text-sm px-2 py-1 rounded border border-yellow-500 outline-none"
                                      autoFocus
                                    />
                                    <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => toggleOpera(opera.id)}
                                      className="flex-1 flex items-center gap-2"
                                    >
                                      {expandedOperas[opera.id] ? (
                                        <ChevronDown className="w-3 h-3 text-yellow-400" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 text-gray-400" />
                                      )}
                                      <BookOpen className="w-4 h-4 text-yellow-400" />
                                      <span className="text-yellow-100 text-sm">{opera.name}</span>
                                      <span className="text-yellow-400/60 text-xs">({countTotalTakes(opera)} take)</span>
                                    </button>
                                    <button
                                      onClick={() => startEditing('opera', opera.id, opera.name)}
                                      className="p-2.5 text-yellow-400 active:text-yellow-300"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteOpera(opera.id)}
                                      className="p-2.5 text-red-400 active:text-red-300"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>

                              {expandedOperas[opera.id] && (
                                <div className="px-2 pb-2 space-y-1">
                                  {opera.tracks?.map((track) => (
                                    <div key={track.id} className="bg-purple-900/30 border border-purple-700/50 rounded-lg overflow-hidden">
                                      <div className="flex items-center justify-between p-2">
                                        {editingItem?.type === 'track' && editingItem?.id === track.id ? (
                                          <div className="flex-1 flex items-center gap-2">
                                            <FolderOpen className="w-4 h-4 text-purple-400" />
                                            <input
                                              type="text"
                                              value={editingName}
                                              onChange={(e) => setEditingName(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveEditing();
                                                if (e.key === 'Escape') cancelEditing();
                                              }}
                                              className="flex-1 bg-purple-800/50 text-white text-sm px-2 py-1 rounded border border-purple-500 outline-none"
                                              autoFocus
                                            />
                                            <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
                                              <Check className="w-4 h-4" />
                                            </button>
                                            <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => toggleTrack(track.id)}
                                              className="flex-1 flex items-center gap-2"
                                            >
                                              {expandedTracks[track.id] ? (
                                                <ChevronDown className="w-3 h-3 text-purple-400" />
                                              ) : (
                                                <ChevronRight className="w-3 h-3 text-gray-400" />
                                              )}
                                              <FolderOpen className="w-4 h-4 text-purple-400" />
                                              <span className="text-white text-sm">{track.name}</span>
                                              <span className="text-gray-400 text-xs">({countTotalTakes(track)} take)</span>
                                            </button>
                                            <button
                                              onClick={() => startEditing('track', track.id, track.name)}
                                              className="p-2.5 text-purple-400 active:text-purple-300"
                                            >
                                              <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteTrack(track.id)}
                                              className="p-2.5 text-red-400 active:text-red-300"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </>
                                        )}
                                      </div>

                                      {expandedTracks[track.id] && (
                                        <div className="px-2 pb-2 space-y-1">
                                          {track.fragments?.map((fragment) => (
                                            <div key={fragment.id} className="bg-gray-700 rounded-lg overflow-hidden">
                                              <div className="flex items-center justify-between p-2">
                                                {editingItem?.type === 'fragment' && editingItem?.id === fragment.id ? (
                                                  <div className="flex-1 flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-green-400" />
                                                    <input
                                                      type="text"
                                                      value={editingName}
                                                      onChange={(e) => setEditingName(e.target.value)}
                                                      onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveEditing();
                                                        if (e.key === 'Escape') cancelEditing();
                                                      }}
                                                      className="flex-1 bg-gray-600 text-white text-sm px-2 py-1 rounded border border-green-500 outline-none"
                                                      autoFocus
                                                    />
                                                    <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
                                                      <Check className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
                                                      <X className="w-4 h-4" />
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <button
                                                      onClick={() => toggleFragment(fragment.id)}
                                                      className="flex-1 flex items-center gap-2"
                                                    >
                                                      {expandedFragments[fragment.id] ? (
                                                        <ChevronDown className="w-3 h-3 text-green-400" />
                                                      ) : (
                                                        <ChevronRight className="w-3 h-3 text-gray-400" />
                                                      )}
                                                      <FileText className="w-4 h-4 text-green-400" />
                                                      <span className="text-white text-sm">{fragment.name}</span>
                                                      <span className="text-gray-400 text-xs">({fragment.takes?.length || 0} take)</span>
                                                    </button>
                                                    <div className="flex items-center gap-1">
                                                      <button
                                                        onClick={() => selectFragmentAsSession(fragment, track, opera, item)}
                                                        className="p-1.5 text-blue-400 active:text-blue-300"
                                                        title="Usa come sessione"
                                                      >
                                                        <Check className="w-4 h-4" />
                                                      </button>
                                                      <button
                                                        onClick={() => startEditing('fragment', fragment.id, fragment.name)}
                                                        className="p-1.5 text-green-400 active:text-green-300"
                                                      >
                                                        <Edit3 className="w-4 h-4" />
                                                      </button>
                                                      <button
                                                        onClick={() => handleDeleteFragment(fragment.id)}
                                                        className="p-2.5 text-red-400 active:text-red-300"
                                                      >
                                                        <Trash2 className="w-4 h-4" />
                                                      </button>
                                                    </div>
                                                  </>
                                                )}
                                              </div>

                                              {expandedFragments[fragment.id] && fragment.takes?.length > 0 && (
                                                <div className="px-2 pb-2 space-y-1">
                                                  {fragment.takes.map((take, index) => (
                                                    <div
                                                      key={take.id}
                                                      className="flex items-center justify-between bg-gray-600 rounded p-2"
                                                    >
                                                      {editingItem?.type === 'take' && editingItem?.id === take.id ? (
                                                        <div className="flex-1 flex items-center gap-2">
                                                          <input
                                                            type="text"
                                                            value={editingName}
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                              if (e.key === 'Enter') saveEditing();
                                                              if (e.key === 'Escape') cancelEditing();
                                                            }}
                                                            className="flex-1 bg-gray-500 text-white text-xs px-2 py-1 rounded border border-blue-500 outline-none"
                                                            autoFocus
                                                          />
                                                          <button onClick={saveEditing} className="p-1 text-green-400">
                                                            <Check className="w-3 h-3" />
                                                          </button>
                                                          <button onClick={cancelEditing} className="p-1 text-gray-400">
                                                            <X className="w-3 h-3" />
                                                          </button>
                                                        </div>
                                                      ) : (
                                                        <>
                                                          <button
                                                            onClick={() => playTakeFromLibrary(take, index, fragment.name)}
                                                            className="flex items-center gap-2"
                                                          >
                                                            <Play className="w-4 h-4 text-white" />
                                                            <span className="text-white text-xs">{take.name || `Take ${index + 1}`}</span>
                                                            {take.duration > 0 && <span className="text-blue-400 text-xs">{formatTakeDuration(take.duration)}</span>}
                                                            <span className="text-gray-400 text-xs">{formatTime(take.createdAt)}</span>
                                                          </button>
                                                          <div className="flex items-center gap-1">
                                                            <button
                                                              onClick={() => startEditing('take', take.id, take.name || `Take ${index + 1}`)}
                                                              className="p-3 text-blue-400 active:text-blue-300"
                                                            >
                                                              <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                              onClick={() => shareTakeFromLibrary(take, take.name || `Take ${index + 1}`)}
                                                              className="p-3 text-purple-400 active:text-purple-300"
                                                            >
                                                              <Share2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                              onClick={() => handleDeleteTake(take.id)}
                                                              className="p-3 text-red-400 active:text-red-300"
                                                            >
                                                              <Trash2 className="w-4 h-4" />
                                                            </button>
                                                          </div>
                                                        </>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : item.type === 'opera' ? (
                    // OPERA standalone (senza autore) - giallo
                    <div key={item.id} className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3">
                        {editingItem?.type === 'opera' && editingItem?.id === item.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-yellow-400" />
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              className="flex-1 bg-yellow-800/50 text-yellow-100 text-sm px-2 py-1 rounded border border-yellow-500 outline-none"
                              autoFocus
                            />
                            <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleOpera(item.id)}
                              className="flex-1 flex items-center gap-2"
                            >
                              {expandedOperas[item.id] ? (
                                <ChevronDown className="w-4 h-4 text-yellow-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                              <BookOpen className="w-4 h-4 text-yellow-400" />
                              <span className="text-yellow-100 text-sm font-medium">{item.name}</span>
                              <span className="text-yellow-500/60 text-xs">({countTotalTakes(item)} take)</span>
                            </button>
                            <button
                              onClick={() => startEditing('opera', item.id, item.name)}
                              className="p-3 text-yellow-400 active:text-yellow-300"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOpera(item.id)}
                              className="p-3 text-red-400 active:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>

                      {expandedOperas[item.id] && (
                        <div className="px-3 pb-3 space-y-2">
                          {item.tracks?.map((track) => (
                            <div key={track.id} className="bg-purple-900/30 border border-purple-700/50 rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between p-2">
                                {editingItem?.type === 'track' && editingItem?.id === track.id ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <FolderOpen className="w-4 h-4 text-purple-400" />
                                    <input
                                      type="text"
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEditing();
                                        if (e.key === 'Escape') cancelEditing();
                                      }}
                                      className="flex-1 bg-purple-800/50 text-white text-sm px-2 py-1 rounded border border-purple-500 outline-none"
                                      autoFocus
                                    />
                                    <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => toggleTrack(track.id)}
                                      className="flex-1 flex items-center gap-2"
                                    >
                                      {expandedTracks[track.id] ? (
                                        <ChevronDown className="w-3 h-3 text-purple-400" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 text-gray-400" />
                                      )}
                                      <FolderOpen className="w-4 h-4 text-purple-400" />
                                      <span className="text-white text-sm">{track.name}</span>
                                      <span className="text-gray-400 text-xs">({countTotalTakes(track)} take)</span>
                                    </button>
                                    <button
                                      onClick={() => startEditing('track', track.id, track.name)}
                                      className="p-2.5 text-purple-400 active:text-purple-300"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTrack(track.id)}
                                      className="p-2.5 text-red-400 active:text-red-300"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>

                              {expandedTracks[track.id] && (
                                <div className="px-2 pb-2 space-y-1">
                                  {track.fragments?.map((fragment) => (
                                    <div key={fragment.id} className="bg-gray-700 rounded-lg overflow-hidden">
                                      <div className="flex items-center justify-between p-2">
                                        {editingItem?.type === 'fragment' && editingItem?.id === fragment.id ? (
                                          <div className="flex-1 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-green-400" />
                                            <input
                                              type="text"
                                              value={editingName}
                                              onChange={(e) => setEditingName(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveEditing();
                                                if (e.key === 'Escape') cancelEditing();
                                              }}
                                              className="flex-1 bg-gray-600 text-white text-sm px-2 py-1 rounded border border-green-500 outline-none"
                                              autoFocus
                                            />
                                            <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
                                              <Check className="w-4 h-4" />
                                            </button>
                                            <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => toggleFragment(fragment.id)}
                                              className="flex-1 flex items-center gap-2"
                                            >
                                              {expandedFragments[fragment.id] ? (
                                                <ChevronDown className="w-3 h-3 text-green-400" />
                                              ) : (
                                                <ChevronRight className="w-3 h-3 text-gray-400" />
                                              )}
                                              <FileText className="w-4 h-4 text-green-400" />
                                              <span className="text-white text-sm">{fragment.name}</span>
                                              <span className="text-gray-400 text-xs">({fragment.takes?.length || 0} take)</span>
                                            </button>
                                            <div className="flex items-center gap-1">
                                              <button
                                                onClick={() => selectFragmentAsSession(fragment, track, item)}
                                                className="p-1.5 text-blue-400 active:text-blue-300"
                                                title="Usa come sessione"
                                              >
                                                <Check className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={() => startEditing('fragment', fragment.id, fragment.name)}
                                                className="p-1.5 text-green-400 active:text-green-300"
                                              >
                                                <Edit3 className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={() => handleDeleteFragment(fragment.id)}
                                                className="p-2.5 text-red-400 active:text-red-300"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>

                                      {expandedFragments[fragment.id] && fragment.takes?.length > 0 && (
                                        <div className="px-2 pb-2 space-y-1">
                                          {fragment.takes.map((take, index) => (
                                            <div
                                              key={take.id}
                                              className="flex items-center justify-between bg-gray-600 rounded p-2"
                                            >
                                              {editingItem?.type === 'take' && editingItem?.id === take.id ? (
                                                <div className="flex-1 flex items-center gap-2">
                                                  <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') saveEditing();
                                                      if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                    className="flex-1 bg-gray-500 text-white text-xs px-2 py-1 rounded border border-blue-500 outline-none"
                                                    autoFocus
                                                  />
                                                  <button onClick={saveEditing} className="p-1 text-green-400">
                                                    <Check className="w-3 h-3" />
                                                  </button>
                                                  <button onClick={cancelEditing} className="p-1 text-gray-400">
                                                    <X className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              ) : (
                                                <>
                                                  <button
                                                    onClick={() => playTakeFromLibrary(take, index, fragment.name)}
                                                    className="flex items-center gap-2"
                                                  >
                                                    <Play className="w-4 h-4 text-white" />
                                                    <span className="text-white text-xs">{take.name || `Take ${index + 1}`}</span>
                                                    {take.duration > 0 && <span className="text-blue-400 text-xs">{formatTakeDuration(take.duration)}</span>}
                                                    <span className="text-gray-400 text-xs">{formatTime(take.createdAt)}</span>
                                                  </button>
                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      onClick={() => startEditing('take', take.id, take.name || `Take ${index + 1}`)}
                                                      className="p-3 text-blue-400 active:text-blue-300"
                                                    >
                                                      <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                      onClick={() => shareTakeFromLibrary(take, take.name || `Take ${index + 1}`)}
                                                      className="p-3 text-purple-400 active:text-purple-300"
                                                    >
                                                      <Share2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                      onClick={() => handleDeleteTake(take.id)}
                                                      className="p-3 text-red-400 active:text-red-300"
                                                    >
                                                      <Trash2 className="w-4 h-4" />
                                                    </button>
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // BRANO standalone (senza opera) - viola
                    <div key={item.id} className="bg-purple-900/30 border border-purple-700/50 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3">
                        {editingItem?.type === 'track' && editingItem?.id === item.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-purple-400" />
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              className="flex-1 bg-purple-800/50 text-white text-sm px-2 py-1 rounded border border-purple-500 outline-none"
                              autoFocus
                            />
                            <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleTrack(item.id)}
                              className="flex-1 flex items-center gap-2"
                            >
                              {expandedTracks[item.id] ? (
                                <ChevronDown className="w-4 h-4 text-purple-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                              <FolderOpen className="w-4 h-4 text-purple-400" />
                              <span className="text-purple-100 text-sm font-medium">{item.name}</span>
                              <span className="text-purple-400/60 text-xs">({countTotalTakes(item)} take)</span>
                            </button>
                            <button
                              onClick={() => startEditing('track', item.id, item.name)}
                              className="p-3 text-purple-400 active:text-purple-300"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTrack(item.id)}
                              className="p-3 text-red-400 active:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>

                      {expandedTracks[item.id] && (
                        <div className="px-3 pb-3 space-y-2">
                          {item.fragments?.map((fragment) => (
                            <div key={fragment.id} className="bg-gray-700 rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between p-2">
                                {editingItem?.type === 'fragment' && editingItem?.id === fragment.id ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-green-400" />
                                    <input
                                      type="text"
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEditing();
                                        if (e.key === 'Escape') cancelEditing();
                                      }}
                                      className="flex-1 bg-gray-600 text-white text-sm px-2 py-1 rounded border border-green-500 outline-none"
                                      autoFocus
                                    />
                                    <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => toggleFragment(fragment.id)}
                                      className="flex-1 flex items-center gap-2"
                                    >
                                      {expandedFragments[fragment.id] ? (
                                        <ChevronDown className="w-3 h-3 text-green-400" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 text-gray-400" />
                                      )}
                                      <FileText className="w-4 h-4 text-green-400" />
                                      <span className="text-white text-sm">{fragment.name}</span>
                                      <span className="text-gray-400 text-xs">({fragment.takes?.length || 0} take)</span>
                                    </button>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => selectFragmentAsSession(fragment, item)}
                                        className="p-1.5 text-blue-400 active:text-blue-300"
                                        title="Usa come sessione"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => startEditing('fragment', fragment.id, fragment.name)}
                                        className="p-1.5 text-green-400 active:text-green-300"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteFragment(fragment.id)}
                                        className="p-2.5 text-red-400 active:text-red-300"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>

                              {expandedFragments[fragment.id] && fragment.takes?.length > 0 && (
                                <div className="px-2 pb-2 space-y-1">
                                  {fragment.takes.map((take, index) => (
                                    <div
                                      key={take.id}
                                      className="flex items-center justify-between bg-gray-600 rounded p-2"
                                    >
                                      {editingItem?.type === 'take' && editingItem?.id === take.id ? (
                                        <div className="flex-1 flex items-center gap-2">
                                          <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') saveEditing();
                                              if (e.key === 'Escape') cancelEditing();
                                            }}
                                            className="flex-1 bg-gray-500 text-white text-xs px-2 py-1 rounded border border-blue-500 outline-none"
                                            autoFocus
                                          />
                                          <button onClick={saveEditing} className="p-1 text-green-400">
                                            <Check className="w-3 h-3" />
                                          </button>
                                          <button onClick={cancelEditing} className="p-1 text-gray-400">
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => playTakeFromLibrary(take, index, fragment.name)}
                                            className="flex items-center gap-2"
                                          >
                                            <Play className="w-4 h-4 text-white" />
                                            <span className="text-white text-xs">{take.name || `Take ${index + 1}`}</span>
                                            {take.duration > 0 && <span className="text-blue-400 text-xs">{formatTakeDuration(take.duration)}</span>}
                                            <span className="text-gray-400 text-xs">{formatTime(take.createdAt)}</span>
                                          </button>
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => startEditing('take', take.id, take.name || `Take ${index + 1}`)}
                                              className="p-3 text-blue-400 active:text-blue-300"
                                            >
                                              <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => shareTakeFromLibrary(take, take.name || `Take ${index + 1}`)}
                                              className="p-3 text-purple-400 active:text-purple-300"
                                            >
                                              <Share2 className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteTake(take.id)}
                                              className="p-3 text-red-400 active:text-red-300"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ))
              )}
            </div>

            <button
              onClick={() => {
                setShowLibrary(false);
                closePlayingTake();
              }}
              className="w-full mt-4 py-3 bg-blue-600 text-white text-lg font-semibold rounded-xl active:bg-blue-700 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Modale Player Take - fullscreen con loop */}
      {playingTake && (
        <div
          className="fixed inset-0 z-[100] bg-black flex flex-col"
          onClick={closePlayingTake}
        >la sini
          {/* Header con info e pulsante chiudi */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Take {playingTake.index + 1}</p>
                <p className="text-gray-400 text-sm">{playingTake.fragmentName}</p>
              </div>
              <button
                onClick={closePlayingTake}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Player video/audio */}
          <div className="flex-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {playingTake.mimeType?.startsWith('video') ? (
              <video
                src={playingTake.url}
                autoPlay
                loop
                playsInline
                controls
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full bg-purple-600/30 flex items-center justify-center">
                  <Mic className="w-16 h-16 text-purple-400" />
                </div>
                <audio
                  src={playingTake.url}
                  autoPlay
                  loop
                  controls
                  className="w-80"
                />
              </div>
            )}
          </div>

          {/* Footer con hint */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-gray-400 text-center text-sm">Tocca fuori dal player per chiudere</p>
          </div>
        </div>
      )}

      {/* Media Area - Full screen, responsive to rotation - nascosto quando non nel tab Registra */}
      <div ref={videoContainerRef} className={`absolute inset-0 flex items-center justify-center bg-black touch-none ${activeTab !== 'registra' ? 'hidden' : ''}`}>
        {error ? (
          <div className="flex flex-col items-center justify-center bg-gray-900 p-6 rounded-lg">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <p className="text-white text-center">{error}</p>
            <button
              onClick={() => initMedia()}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-full"
            >
              Riprova
            </button>
          </div>
        ) : recordedVideo ? (
          // Playback: video o audio
          recordedMedia?.isVideo !== false ? (
            <video
              key={recordedVideo.url}
              ref={videoPlaybackRef}
              src={recordedVideo.url}
              className="w-full h-full object-contain bg-black"
              playsInline
              preload="auto"
              autoPlay
              loop
              onPlay={() => {
                setIsPlaying(true);
                playPlayingSound();
              }}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            // Audio playback - player in basso, controlli sopra
            <div className="w-full h-full flex flex-col bg-black">
              {/* Spazio per controlli in alto */}
              <div className="flex-1" />
              {/* Player audio in basso */}
              <div className="p-4 pb-32">
                <audio
                  ref={videoPlaybackRef}
                  src={recordedVideo.url}
                  controls
                  autoPlay
                  loop
                  className="w-full max-w-md mx-auto"
                  onPlay={() => {
                    setIsPlaying(true);
                    playPlayingSound();
                  }}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            </div>
          )
        ) : videoEnabled ? (
          // Video preview - no flip per coerenza con registrazione e condivisione
          <video
            ref={videoPreviewRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        ) : (
          // Audio-only mode: simple indicator
          <div className="w-full h-full flex flex-col items-center justify-center bg-black">
            {/* Indicatore modalità */}
            <div className="flex items-center gap-3 text-white/70">
              <Mic className={`w-10 h-10 ${isRecording ? 'text-red-500 animate-pulse' : 'text-green-400'}`} />
              <span className="text-xl">
                {isRecording ? 'Registrazione in corso...' : 'Pronto per registrare'}
              </span>
            </div>
          </div>
        )}
      </div>


      {/* Controls - Barra sotto header quando c'è video/audio registrato */}
      {recordedVideo ? (
        <>
          {/* Barra controlli sotto l'header */}
          <div className="absolute top-14 left-0 right-0 z-20 bg-gray-800/90 backdrop-blur-sm px-4 py-3">
            <div className="flex items-center justify-center gap-3">
              {/* Back - scarta e torna a ready (pedale SX) */}
              <button onClick={handleLeftPedal} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-700 active:bg-gray-600 min-w-[80px] justify-center">
                <ArrowLeft className="w-5 h-5 text-white" />
                <span className="text-white text-sm font-medium">Scarta</span>
              </button>

              {/* Accept - salva (pedale DX) */}
              <button
                onClick={handleManualSave}
                disabled={currentRecordingSaved}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl min-w-[80px] justify-center ${
                  currentRecordingSaved
                    ? 'bg-green-800 ring-1 ring-green-400'
                    : 'bg-green-600 active:bg-green-500'
                }`}
              >
                <Check className={`w-5 h-5 ${currentRecordingSaved ? 'text-green-300' : 'text-white'}`} />
                <span className={`text-sm font-medium ${currentRecordingSaved ? 'text-green-300' : 'text-white'}`}>
                  {currentRecordingSaved ? 'Salvato' : 'Salva'}
                </span>
              </button>

              {/* Share */}
              <button onClick={shareVideo} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-purple-600 active:bg-purple-500 min-w-[80px] justify-center">
                <Share2 className="w-5 h-5 text-white" />
                <span className="text-white text-sm font-medium">Condividi</span>
              </button>
            </div>
          </div>

          {/* Toast feedback salvataggio */}
          {saveMessage && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
              {saveMessage}
            </div>
          )}
        </>
      ) : null}
          </>
        )}

        {/* Tab Libreria - mostra l'albero completo della libreria */}
        {activeTab === 'libreria' && (
          <div className={`h-full overflow-y-auto p-4 pb-20 ${isDark ? 'bg-gray-950' : 'bg-white'}`}>
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="w-5 h-5 text-purple-400" />
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Libreria</h2>
              <span className="text-gray-500 text-xs">({library.length} elementi)</span>
              <button
                onClick={loadLibrary}
                className="ml-auto p-2 text-gray-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Lista libreria - Autore > Opera > Brano > Frammento > Takes */}
            <div className="space-y-2">
              {library.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Libreria vuota</p>
                  <p className="text-gray-600 text-sm mt-1">Registra e salva qualcosa per vederlo qui</p>
                  <button
                    onClick={loadLibrary}
                    className="mt-3 text-purple-400 text-xs underline"
                  >
                    Ricarica libreria
                  </button>
                </div>
              ) : (
                library.map((item) => (
                  item.type === 'author' ? (
                    // AUTORE - Livello più alto (cyan)
                    <div key={item.id} className="bg-cyan-900/30 border border-cyan-700/50 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3">
                        {editingItem?.type === 'author' && editingItem?.id === item.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <User className="w-4 h-4 text-cyan-400" />
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              className="flex-1 bg-cyan-800/50 text-cyan-100 text-sm px-2 py-1 rounded border border-cyan-500 outline-none"
                              autoFocus
                            />
                            <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleAuthor(item.id)}
                              className="flex-1 flex items-center gap-2"
                            >
                              {expandedAuthors[item.id] ? (
                                <ChevronDown className="w-4 h-4 text-cyan-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                              <User className="w-4 h-4 text-cyan-400" />
                              <span className="text-cyan-100 text-sm font-medium">{item.name}</span>
                              <span className="text-cyan-500/60 text-xs">({countTotalTakes(item)} take)</span>
                            </button>
                            <button
                              onClick={() => startEditing('author', item.id, item.name)}
                              className="p-3 text-cyan-400 active:text-cyan-300"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAuthor(item.id)}
                              className="p-3 text-red-400 active:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>

                      {expandedAuthors[item.id] && (
                        <div className="px-3 pb-3 space-y-2">
                          {item.operas?.map((opera) => (
                            <div key={opera.id} className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between p-2">
                                {editingItem?.type === 'opera' && editingItem?.id === opera.id ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-yellow-400" />
                                    <input
                                      type="text"
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEditing();
                                        if (e.key === 'Escape') cancelEditing();
                                      }}
                                      className="flex-1 bg-yellow-800/50 text-yellow-100 text-sm px-2 py-1 rounded border border-yellow-500 outline-none"
                                      autoFocus
                                    />
                                    <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => toggleOpera(opera.id)}
                                      className="flex-1 flex items-center gap-2"
                                    >
                                      {expandedOperas[opera.id] ? (
                                        <ChevronDown className="w-3 h-3 text-yellow-400" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 text-gray-400" />
                                      )}
                                      <BookOpen className="w-4 h-4 text-yellow-400" />
                                      <span className="text-yellow-100 text-sm">{opera.name}</span>
                                      <span className="text-yellow-400/60 text-xs">({countTotalTakes(opera)} take)</span>
                                    </button>
                                    <button
                                      onClick={() => startEditing('opera', opera.id, opera.name)}
                                      className="p-2.5 text-yellow-400 active:text-yellow-300"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteOpera(opera.id)}
                                      className="p-2.5 text-red-400 active:text-red-300"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>

                              {expandedOperas[opera.id] && (
                                <div className="px-2 pb-2 space-y-1">
                                  {opera.tracks?.map((track) => (
                                    <div key={track.id} className="bg-purple-900/30 border border-purple-700/50 rounded-lg overflow-hidden">
                                      <div className="flex items-center justify-between p-2">
                                        {editingItem?.type === 'track' && editingItem?.id === track.id ? (
                                          <div className="flex-1 flex items-center gap-2">
                                            <FolderOpen className="w-4 h-4 text-purple-400" />
                                            <input
                                              type="text"
                                              value={editingName}
                                              onChange={(e) => setEditingName(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveEditing();
                                                if (e.key === 'Escape') cancelEditing();
                                              }}
                                              className="flex-1 bg-purple-800/50 text-white text-sm px-2 py-1 rounded border border-purple-500 outline-none"
                                              autoFocus
                                            />
                                            <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
                                              <Check className="w-4 h-4" />
                                            </button>
                                            <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => toggleTrack(track.id)}
                                              className="flex-1 flex items-center gap-2"
                                            >
                                              {expandedTracks[track.id] ? (
                                                <ChevronDown className="w-3 h-3 text-purple-400" />
                                              ) : (
                                                <ChevronRight className="w-3 h-3 text-gray-400" />
                                              )}
                                              <FolderOpen className="w-4 h-4 text-purple-400" />
                                              <span className="text-white text-sm">{track.name}</span>
                                              <span className="text-gray-400 text-xs">({countTotalTakes(track)} take)</span>
                                            </button>
                                            <button
                                              onClick={() => startEditing('track', track.id, track.name)}
                                              className="p-2.5 text-purple-400 active:text-purple-300"
                                            >
                                              <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteTrack(track.id)}
                                              className="p-2.5 text-red-400 active:text-red-300"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </>
                                        )}
                                      </div>

                                      {expandedTracks[track.id] && (
                                        <div className="px-2 pb-2 space-y-1">
                                          {/* Take orfani (senza fragment) */}
                                          {track.orphanTakes?.length > 0 && (
                                            <div className="bg-gray-700/30 rounded p-2 space-y-1">
                                              <p className="text-gray-400 text-xs mb-1">Take diretti:</p>
                                              {track.orphanTakes.map((take, index) => (
                                                <div
                                                  key={take.id}
                                                  className="flex items-center justify-between py-1 px-1 bg-gray-600/30 rounded"
                                                >
                                                  {editingItem?.type === 'take' && editingItem?.id === take.id ? (
                                                    <div className="flex-1 flex items-center gap-2">
                                                      <input
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                          if (e.key === 'Enter') saveEditing();
                                                          if (e.key === 'Escape') cancelEditing();
                                                        }}
                                                        className="flex-1 bg-gray-500 text-white text-xs px-2 py-1 rounded border border-blue-500 outline-none"
                                                        autoFocus
                                                      />
                                                      <button onClick={saveEditing} className="p-1 text-green-400">
                                                        <Check className="w-3 h-3" />
                                                      </button>
                                                      <button onClick={cancelEditing} className="p-1 text-gray-400">
                                                        <X className="w-3 h-3" />
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <>
                                                      <button
                                                        onClick={() => playTakeFromLibrary(take, index, track.name)}
                                                        className="flex items-center gap-2"
                                                      >
                                                        <Play className="w-4 h-4 text-white" />
                                                        <span className="text-white text-xs">{take.name || `Take ${index + 1}`}</span>
                                                        {take.duration > 0 && <span className="text-blue-400 text-xs">{formatTakeDuration(take.duration)}</span>}
                                                        <span className="text-gray-400 text-xs">{formatTime(take.createdAt)}</span>
                                                      </button>
                                                      <div className="flex items-center gap-1">
                                                        <button
                                                          onClick={() => startEditing('take', take.id, take.name || `Take ${index + 1}`)}
                                                          className="p-3 text-blue-400 active:text-blue-300"
                                                        >
                                                          <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                          onClick={() => shareTakeFromLibrary(take, take.name || `Take ${index + 1}`)}
                                                          className="p-3 text-purple-400 active:text-purple-300"
                                                        >
                                                          <Share2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                          onClick={() => handleDeleteTake(take.id)}
                                                          className="p-3 text-red-400 active:text-red-300"
                                                        >
                                                          <Trash2 className="w-4 h-4" />
                                                        </button>
                                                      </div>
                                                    </>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          )}

                                          {/* Frammenti */}
                                          {track.fragments?.map((fragment) => (
                                            <div key={fragment.id} className="bg-green-900/30 border border-green-700/50 rounded-lg overflow-hidden">
                                              <div className="flex items-center justify-between p-1.5">
                                                {editingItem?.type === 'fragment' && editingItem?.id === fragment.id ? (
                                                  <div className="flex-1 flex items-center gap-2">
                                                    <input
                                                      type="text"
                                                      value={editingName}
                                                      onChange={(e) => setEditingName(e.target.value)}
                                                      onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveEditing();
                                                        if (e.key === 'Escape') cancelEditing();
                                                      }}
                                                      className="flex-1 bg-green-800/50 text-green-100 text-xs px-2 py-1 rounded border border-green-500 outline-none"
                                                      autoFocus
                                                    />
                                                    <button onClick={saveEditing} className="p-1 text-green-400">
                                                      <Check className="w-3 h-3" />
                                                    </button>
                                                    <button onClick={cancelEditing} className="p-1 text-gray-400">
                                                      <X className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <button
                                                      onClick={() => toggleFragment(fragment.id)}
                                                      className="flex-1 flex items-center gap-1"
                                                    >
                                                      {expandedFragments[fragment.id] ? (
                                                        <ChevronDown className="w-3 h-3 text-green-400" />
                                                      ) : (
                                                        <ChevronRight className="w-3 h-3 text-gray-400" />
                                                      )}
                                                      <span className="text-green-200 text-xs">{fragment.name}</span>
                                                      <span className="text-green-500/60 text-[10px]">({fragment.takes?.length || 0})</span>
                                                    </button>
                                                    <button
                                                      onClick={() => selectFragmentAsSession(fragment, track, opera, item)}
                                                      className="p-1 text-blue-400 active:text-blue-300"
                                                      title="Usa come sessione"
                                                    >
                                                      <Music className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                      onClick={() => startEditing('fragment', fragment.id, fragment.name)}
                                                      className="p-1 text-green-400 active:text-green-300"
                                                    >
                                                      <Edit3 className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                      onClick={() => handleDeleteFragment(fragment.id)}
                                                      className="p-1 text-red-400 active:text-red-300"
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                    </button>
                                                  </>
                                                )}
                                              </div>

                                              {expandedFragments[fragment.id] && fragment.takes?.length > 0 && (
                                                <div className="px-1.5 pb-1.5 space-y-1">
                                                  {fragment.takes.map((take, index) => (
                                                    <div
                                                      key={take.id}
                                                      className="flex items-center justify-between py-1 px-1 bg-gray-700/50 rounded"
                                                    >
                                                      {editingItem?.type === 'take' && editingItem?.id === take.id ? (
                                                        <div className="flex-1 flex items-center gap-2">
                                                          <input
                                                            type="text"
                                                            value={editingName}
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                              if (e.key === 'Enter') saveEditing();
                                                              if (e.key === 'Escape') cancelEditing();
                                                            }}
                                                            className="flex-1 bg-gray-500 text-white text-xs px-2 py-1 rounded border border-blue-500 outline-none"
                                                            autoFocus
                                                          />
                                                          <button onClick={saveEditing} className="p-1 text-green-400">
                                                            <Check className="w-3 h-3" />
                                                          </button>
                                                          <button onClick={cancelEditing} className="p-1 text-gray-400">
                                                            <X className="w-3 h-3" />
                                                          </button>
                                                        </div>
                                                      ) : (
                                                        <>
                                                          <button
                                                            onClick={() => playTakeFromLibrary(take, index, fragment.name)}
                                                            className="flex items-center gap-2"
                                                          >
                                                            <Play className="w-4 h-4 text-white" />
                                                            <span className="text-white text-xs">{take.name || `Take ${index + 1}`}</span>
                                                            {take.duration > 0 && <span className="text-blue-400 text-xs">{formatTakeDuration(take.duration)}</span>}
                                                            <span className="text-gray-400 text-xs">{formatTime(take.createdAt)}</span>
                                                          </button>
                                                          <div className="flex items-center gap-1">
                                                            <button
                                                              onClick={() => startEditing('take', take.id, take.name || `Take ${index + 1}`)}
                                                              className="p-3 text-blue-400 active:text-blue-300"
                                                            >
                                                              <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                              onClick={() => shareTakeFromLibrary(take, take.name || `Take ${index + 1}`)}
                                                              className="p-3 text-purple-400 active:text-purple-300"
                                                            >
                                                              <Share2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                              onClick={() => handleDeleteTake(take.id)}
                                                              className="p-3 text-red-400 active:text-red-300"
                                                            >
                                                              <Trash2 className="w-4 h-4" />
                                                            </button>
                                                          </div>
                                                        </>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : item.type === 'opera' ? (
                    // OPERA STANDALONE (senza autore) - giallo
                    <div key={item.id} className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3">
                        {editingItem?.type === 'opera' && editingItem?.id === item.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-yellow-400" />
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              className="flex-1 bg-yellow-800/50 text-yellow-100 text-sm px-2 py-1 rounded border border-yellow-500 outline-none"
                              autoFocus
                            />
                            <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleOpera(item.id)}
                              className="flex-1 flex items-center gap-2"
                            >
                              {expandedOperas[item.id] ? (
                                <ChevronDown className="w-4 h-4 text-yellow-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                              <BookOpen className="w-4 h-4 text-yellow-400" />
                              <span className="text-yellow-100 text-sm font-medium">{item.name}</span>
                              <span className="text-yellow-500/60 text-xs">({countTotalTakes(item)} take)</span>
                            </button>
                            <button
                              onClick={() => startEditing('opera', item.id, item.name)}
                              className="p-3 text-yellow-400 active:text-yellow-300"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOpera(item.id)}
                              className="p-3 text-red-400 active:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>

                      {expandedOperas[item.id] && (
                        <div className="px-3 pb-3 space-y-2">
                          {item.tracks?.map((track) => (
                            <div key={track.id} className="bg-purple-900/30 border border-purple-700/50 rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between p-2">
                                {editingItem?.type === 'track' && editingItem?.id === track.id ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <FolderOpen className="w-4 h-4 text-purple-400" />
                                    <input
                                      type="text"
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEditing();
                                        if (e.key === 'Escape') cancelEditing();
                                      }}
                                      className="flex-1 bg-purple-800/50 text-white text-sm px-2 py-1 rounded border border-purple-500 outline-none"
                                      autoFocus
                                    />
                                    <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => toggleTrack(track.id)}
                                      className="flex-1 flex items-center gap-2"
                                    >
                                      {expandedTracks[track.id] ? (
                                        <ChevronDown className="w-3 h-3 text-purple-400" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 text-gray-400" />
                                      )}
                                      <FolderOpen className="w-4 h-4 text-purple-400" />
                                      <span className="text-white text-sm">{track.name}</span>
                                      <span className="text-gray-400 text-xs">({countTotalTakes(track)} take)</span>
                                    </button>
                                    <button
                                      onClick={() => startEditing('track', track.id, track.name)}
                                      className="p-2.5 text-purple-400 active:text-purple-300"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTrack(track.id)}
                                      className="p-2.5 text-red-400 active:text-red-300"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>

                              {expandedTracks[track.id] && (
                                <div className="px-2 pb-2 space-y-1">
                                  {/* Take orfani */}
                                  {track.orphanTakes?.length > 0 && (
                                    <div className="bg-gray-700/30 rounded p-2 space-y-1">
                                      <p className="text-gray-400 text-xs mb-1">Take diretti:</p>
                                      {track.orphanTakes.map((take, index) => (
                                        <div
                                          key={take.id}
                                          className="flex items-center justify-between py-1 px-1 bg-gray-600/30 rounded"
                                        >
                                          {editingItem?.type === 'take' && editingItem?.id === take.id ? (
                                            <div className="flex-1 flex items-center gap-2">
                                              <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') saveEditing();
                                                  if (e.key === 'Escape') cancelEditing();
                                                }}
                                                className="flex-1 bg-gray-500 text-white text-xs px-2 py-1 rounded border border-blue-500 outline-none"
                                                autoFocus
                                              />
                                              <button onClick={saveEditing} className="p-1 text-green-400">
                                                <Check className="w-3 h-3" />
                                              </button>
                                              <button onClick={cancelEditing} className="p-1 text-gray-400">
                                                <X className="w-3 h-3" />
                                              </button>
                                            </div>
                                          ) : (
                                            <>
                                              <button
                                                onClick={() => playTakeFromLibrary(take, index, track.name)}
                                                className="flex items-center gap-2"
                                              >
                                                <Play className="w-4 h-4 text-white" />
                                                <span className="text-white text-xs">{take.name || `Take ${index + 1}`}</span>
                                                {take.duration > 0 && <span className="text-blue-400 text-xs">{formatTakeDuration(take.duration)}</span>}
                                                <span className="text-gray-400 text-xs">{formatTime(take.createdAt)}</span>
                                              </button>
                                              <div className="flex items-center gap-1">
                                                <button
                                                  onClick={() => startEditing('take', take.id, take.name || `Take ${index + 1}`)}
                                                  className="p-3 text-blue-400 active:text-blue-300"
                                                >
                                                  <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                  onClick={() => shareTakeFromLibrary(take, take.name || `Take ${index + 1}`)}
                                                  className="p-3 text-purple-400 active:text-purple-300"
                                                >
                                                  <Share2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteTake(take.id)}
                                                  className="p-3 text-red-400 active:text-red-300"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Frammenti */}
                                  {track.fragments?.map((fragment) => (
                                    <div key={fragment.id} className="bg-green-900/30 border border-green-700/50 rounded-lg overflow-hidden">
                                      <div className="flex items-center justify-between p-1.5">
                                        {editingItem?.type === 'fragment' && editingItem?.id === fragment.id ? (
                                          <div className="flex-1 flex items-center gap-2">
                                            <input
                                              type="text"
                                              value={editingName}
                                              onChange={(e) => setEditingName(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveEditing();
                                                if (e.key === 'Escape') cancelEditing();
                                              }}
                                              className="flex-1 bg-green-800/50 text-green-100 text-xs px-2 py-1 rounded border border-green-500 outline-none"
                                              autoFocus
                                            />
                                            <button onClick={saveEditing} className="p-1 text-green-400">
                                              <Check className="w-3 h-3" />
                                            </button>
                                            <button onClick={cancelEditing} className="p-1 text-gray-400">
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => toggleFragment(fragment.id)}
                                              className="flex-1 flex items-center gap-1"
                                            >
                                              {expandedFragments[fragment.id] ? (
                                                <ChevronDown className="w-3 h-3 text-green-400" />
                                              ) : (
                                                <ChevronRight className="w-3 h-3 text-gray-400" />
                                              )}
                                              <span className="text-green-200 text-xs">{fragment.name}</span>
                                              <span className="text-green-500/60 text-[10px]">({fragment.takes?.length || 0})</span>
                                            </button>
                                            <button
                                              onClick={() => selectFragmentAsSession(fragment, track, item)}
                                              className="p-1 text-blue-400 active:text-blue-300"
                                              title="Usa come sessione"
                                            >
                                              <Music className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => startEditing('fragment', fragment.id, fragment.name)}
                                              className="p-1 text-green-400 active:text-green-300"
                                            >
                                              <Edit3 className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteFragment(fragment.id)}
                                              className="p-1 text-red-400 active:text-red-300"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </>
                                        )}
                                      </div>

                                      {expandedFragments[fragment.id] && fragment.takes?.length > 0 && (
                                        <div className="px-1.5 pb-1.5 space-y-1">
                                          {fragment.takes.map((take, index) => (
                                            <div
                                              key={take.id}
                                              className="flex items-center justify-between py-1 px-1 bg-gray-700/50 rounded"
                                            >
                                              {editingItem?.type === 'take' && editingItem?.id === take.id ? (
                                                <div className="flex-1 flex items-center gap-2">
                                                  <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') saveEditing();
                                                      if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                    className="flex-1 bg-gray-500 text-white text-xs px-2 py-1 rounded border border-blue-500 outline-none"
                                                    autoFocus
                                                  />
                                                  <button onClick={saveEditing} className="p-1 text-green-400">
                                                    <Check className="w-3 h-3" />
                                                  </button>
                                                  <button onClick={cancelEditing} className="p-1 text-gray-400">
                                                    <X className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              ) : (
                                                <>
                                                  <button
                                                    onClick={() => playTakeFromLibrary(take, index, fragment.name)}
                                                    className="flex items-center gap-2"
                                                  >
                                                    <Play className="w-4 h-4 text-white" />
                                                    <span className="text-white text-xs">{take.name || `Take ${index + 1}`}</span>
                                                    {take.duration > 0 && <span className="text-blue-400 text-xs">{formatTakeDuration(take.duration)}</span>}
                                                    <span className="text-gray-400 text-xs">{formatTime(take.createdAt)}</span>
                                                  </button>
                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      onClick={() => startEditing('take', take.id, take.name || `Take ${index + 1}`)}
                                                      className="p-3 text-blue-400 active:text-blue-300"
                                                    >
                                                      <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                      onClick={() => shareTakeFromLibrary(take, take.name || `Take ${index + 1}`)}
                                                      className="p-3 text-purple-400 active:text-purple-300"
                                                    >
                                                      <Share2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                      onClick={() => handleDeleteTake(take.id)}
                                                      className="p-3 text-red-400 active:text-red-300"
                                                    >
                                                      <Trash2 className="w-4 h-4" />
                                                    </button>
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // BRANO STANDALONE (senza autore né opera) - viola
                    <div key={item.id} className="bg-purple-900/30 border border-purple-700/50 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3">
                        {editingItem?.type === 'track' && editingItem?.id === item.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-purple-400" />
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              className="flex-1 bg-purple-800/50 text-white text-sm px-2 py-1 rounded border border-purple-500 outline-none"
                              autoFocus
                            />
                            <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleTrack(item.id)}
                              className="flex-1 flex items-center gap-2"
                            >
                              {expandedTracks[item.id] ? (
                                <ChevronDown className="w-4 h-4 text-purple-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                              <FolderOpen className="w-4 h-4 text-purple-400" />
                              <span className="text-white text-sm font-medium">{item.name}</span>
                              <span className="text-gray-400 text-xs">({countTotalTakes(item)} take)</span>
                            </button>
                            <button
                              onClick={() => startEditing('track', item.id, item.name)}
                              className="p-3 text-purple-400 active:text-purple-300"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTrack(item.id)}
                              className="p-3 text-red-400 active:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>

                      {expandedTracks[item.id] && (
                        <div className="px-3 pb-3 space-y-1">
                          {/* Take orfani */}
                          {item.orphanTakes?.length > 0 && (
                            <div className="bg-gray-700/30 rounded p-2 space-y-1">
                              <p className="text-gray-400 text-xs mb-1">Take diretti:</p>
                              {item.orphanTakes.map((take, index) => (
                                <div
                                  key={take.id}
                                  className="flex items-center justify-between py-1 px-1 bg-gray-600/30 rounded"
                                >
                                  {editingItem?.type === 'take' && editingItem?.id === take.id ? (
                                    <div className="flex-1 flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') saveEditing();
                                          if (e.key === 'Escape') cancelEditing();
                                        }}
                                        className="flex-1 bg-gray-500 text-white text-xs px-2 py-1 rounded border border-blue-500 outline-none"
                                        autoFocus
                                      />
                                      <button onClick={saveEditing} className="p-1 text-green-400">
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button onClick={cancelEditing} className="p-1 text-gray-400">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => playTakeFromLibrary(take, index, item.name)}
                                        className="flex items-center gap-2"
                                      >
                                        <Play className="w-4 h-4 text-white" />
                                        <span className="text-white text-xs">{take.name || `Take ${index + 1}`}</span>
                                        {take.duration > 0 && <span className="text-blue-400 text-xs">{formatTakeDuration(take.duration)}</span>}
                                        <span className="text-gray-400 text-xs">{formatTime(take.createdAt)}</span>
                                      </button>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => startEditing('take', take.id, take.name || `Take ${index + 1}`)}
                                          className="p-3 text-blue-400 active:text-blue-300"
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => shareTakeFromLibrary(take, take.name || `Take ${index + 1}`)}
                                          className="p-3 text-purple-400 active:text-purple-300"
                                        >
                                          <Share2 className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteTake(take.id)}
                                          className="p-3 text-red-400 active:text-red-300"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Frammenti */}
                          {item.fragments?.map((fragment) => (
                            <div key={fragment.id} className="bg-green-900/30 border border-green-700/50 rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between p-1.5">
                                {editingItem?.type === 'fragment' && editingItem?.id === fragment.id ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEditing();
                                        if (e.key === 'Escape') cancelEditing();
                                      }}
                                      className="flex-1 bg-green-800/50 text-green-100 text-xs px-2 py-1 rounded border border-green-500 outline-none"
                                      autoFocus
                                    />
                                    <button onClick={saveEditing} className="p-1 text-green-400">
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button onClick={cancelEditing} className="p-1 text-gray-400">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => toggleFragment(fragment.id)}
                                      className="flex-1 flex items-center gap-1"
                                    >
                                      {expandedFragments[fragment.id] ? (
                                        <ChevronDown className="w-3 h-3 text-green-400" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 text-gray-400" />
                                      )}
                                      <span className="text-green-200 text-xs">{fragment.name}</span>
                                      <span className="text-green-500/60 text-[10px]">({fragment.takes?.length || 0})</span>
                                    </button>
                                    <button
                                      onClick={() => selectFragmentAsSession(fragment, item)}
                                      className="p-1 text-blue-400 active:text-blue-300"
                                      title="Usa come sessione"
                                    >
                                      <Music className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => startEditing('fragment', fragment.id, fragment.name)}
                                      className="p-1 text-green-400 active:text-green-300"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteFragment(fragment.id)}
                                      className="p-1 text-red-400 active:text-red-300"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>

                              {expandedFragments[fragment.id] && fragment.takes?.length > 0 && (
                                <div className="px-1.5 pb-1.5 space-y-1">
                                  {fragment.takes.map((take, index) => (
                                    <div
                                      key={take.id}
                                      className="flex items-center justify-between py-1 px-1 bg-gray-700/50 rounded"
                                    >
                                      {editingItem?.type === 'take' && editingItem?.id === take.id ? (
                                        <div className="flex-1 flex items-center gap-2">
                                          <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') saveEditing();
                                              if (e.key === 'Escape') cancelEditing();
                                            }}
                                            className="flex-1 bg-gray-500 text-white text-xs px-2 py-1 rounded border border-blue-500 outline-none"
                                            autoFocus
                                          />
                                          <button onClick={saveEditing} className="p-1 text-green-400">
                                            <Check className="w-3 h-3" />
                                          </button>
                                          <button onClick={cancelEditing} className="p-1 text-gray-400">
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => playTakeFromLibrary(take, index, fragment.name)}
                                            className="flex items-center gap-2"
                                          >
                                            <Play className="w-4 h-4 text-white" />
                                            <span className="text-white text-xs">{take.name || `Take ${index + 1}`}</span>
                                            {take.duration > 0 && <span className="text-blue-400 text-xs">{formatTakeDuration(take.duration)}</span>}
                                            <span className="text-gray-400 text-xs">{formatTime(take.createdAt)}</span>
                                          </button>
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => startEditing('take', take.id, take.name || `Take ${index + 1}`)}
                                              className="p-3 text-blue-400 active:text-blue-300"
                                            >
                                              <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => shareTakeFromLibrary(take, take.name || `Take ${index + 1}`)}
                                              className="p-3 text-purple-400 active:text-purple-300"
                                            >
                                              <Share2 className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteTake(take.id)}
                                              className="p-3 text-red-400 active:text-red-300"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab Sessioni */}
        {activeTab === 'sessioni' && (
          <SessionsTab onSelectSession={handleSelectSessionFromTab} isDark={isDark} />
        )}

        {/* Tab Statistiche */}
        {activeTab === 'statistiche' && (
          <StatisticsTab isDark={isDark} />
        )}

        {/* Tab Impostazioni */}
        {activeTab === 'impostazioni' && (
          <div className={`h-full overflow-y-auto p-4 ${isDark ? 'bg-gray-950' : 'bg-white'}`}>
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-gray-400" />
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Impostazioni</h2>
            </div>

            {/* Pedali */}
            <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-gray-400" />
                Pedali USB / Tastiera
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Pedale sinistro (Rec)</span>
                  <button
                    onClick={() => setIsListeningForKey('left')}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      isListeningForKey === 'left'
                        ? 'bg-yellow-600 text-white animate-pulse'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {isListeningForKey === 'left' ? 'Premi...' : getKeyDisplayName(leftPedalKey)}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Pedale destro (Play)</span>
                  <button
                    onClick={() => setIsListeningForKey('right')}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      isListeningForKey === 'right'
                        ? 'bg-yellow-600 text-white animate-pulse'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {isListeningForKey === 'right' ? 'Premi...' : getKeyDisplayName(rightPedalKey)}
                  </button>
                </div>
              </div>
            </div>

            {/* Audio Feedback */}
            <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-gray-400" />
                  <span className="text-white">Feedback audio</span>
                </div>
                <button
                  onClick={() => {
                    setAudioFeedbackEnabled(!audioFeedbackEnabled);
                    updateSetting('audioFeedbackEnabled', !audioFeedbackEnabled);
                  }}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    audioFeedbackEnabled ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full mx-1 transition-transform ${
                    audioFeedbackEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* Qualità Video */}
            <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
              <h3 className="text-white font-medium mb-3">Qualità Video</h3>
              <div className="space-y-2">
                {Object.entries(VIDEO_QUALITY_OPTIONS).map(([key, opt]) => (
                  <button
                    key={key}
                    onClick={() => updateSetting('videoQuality', key)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      settings.videoQuality === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tema */}
            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-white">Tema scuro</span>
                <button
                  onClick={() => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    settings.theme === 'dark' ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full mx-1 transition-transform ${
                    settings.theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Tab Bar - nascosta durante registrazione */}
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hidden={isRecording}
        isDark={isDark}
      />
    </div>
  );
}
