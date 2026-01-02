import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
} from '../videoLibrary';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  // Session state
  const [currentSession, setCurrentSession] = useState(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);

  // Library state
  const [library, setLibrary] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [operas, setOperas] = useState([]);
  const [tracks, setTracks] = useState([]);

  // Expanded state for library tree
  const [expandedAuthors, setExpandedAuthors] = useState({});
  const [expandedOperas, setExpandedOperas] = useState({});
  const [expandedTracks, setExpandedTracks] = useState({});
  const [expandedFragments, setExpandedFragments] = useState({});

  // Editing state
  const [editingItem, setEditingItem] = useState(null);
  const [editingName, setEditingName] = useState('');

  // Session picker state
  const [newAuthorName, setNewAuthorName] = useState('');
  const [newOperaName, setNewOperaName] = useState('');
  const [newTrackName, setNewTrackName] = useState('');
  const [newFragmentName, setNewFragmentName] = useState('');
  const [selectedAuthorId, setSelectedAuthorId] = useState(null);
  const [selectedOperaId, setSelectedOperaId] = useState(null);
  const [selectedTrackId, setSelectedTrackId] = useState(null);

  // Take count for current session
  const [takeCount, setTakeCount] = useState(0);

  // Initialize DB and load saved session
  useEffect(() => {
    const init = async () => {
      await initDB();
      const saved = getCurrentSession();
      if (saved && saved.trackId) {
        setCurrentSession(saved);
        // Load take count
        if (saved.fragmentId) {
          const takes = await getTakesByFragment(saved.fragmentId);
          setTakeCount(takes.length);
        } else {
          const takes = await getTakesByTrack(saved.trackId);
          const orphanTakes = takes.filter(t => !t.fragmentId);
          setTakeCount(orphanTakes.length);
        }
      }
    };
    init();
  }, []);

  // Load library data
  const loadLibrary = useCallback(async () => {
    try {
      const lib = await getFullLibrary();
      setLibrary(lib);
    } catch (error) {
      console.error('Errore caricamento libreria:', error);
    }
  }, []);

  // Load authors, operas, tracks for session picker
  const loadAuthors = useCallback(async () => {
    const data = await getAllAuthors();
    setAuthors(data);
  }, []);

  const loadOperas = useCallback(async () => {
    const data = await getAllOperas();
    setOperas(data);
  }, []);

  const loadTracks = useCallback(async () => {
    const data = await getAllTracks();
    setTracks(data);
  }, []);

  // Toggle functions for library tree
  const toggleAuthor = useCallback((authorId) => {
    setExpandedAuthors(prev => ({ ...prev, [authorId]: !prev[authorId] }));
  }, []);

  const toggleOpera = useCallback((operaId) => {
    setExpandedOperas(prev => ({ ...prev, [operaId]: !prev[operaId] }));
  }, []);

  const toggleTrack = useCallback((trackId) => {
    setExpandedTracks(prev => ({ ...prev, [trackId]: !prev[trackId] }));
  }, []);

  const toggleFragment = useCallback((fragmentId) => {
    setExpandedFragments(prev => ({ ...prev, [fragmentId]: !prev[fragmentId] }));
  }, []);

  // Delete functions
  const handleDeleteAuthor = useCallback(async (authorId) => {
    if (!confirm('Eliminare questo autore e tutti i suoi contenuti?')) return;
    try {
      await deleteAuthor(authorId);
      await loadLibrary();
      await loadAuthors();
      if (currentSession?.authorId === authorId) {
        setCurrentSession(null);
        saveCurrentSession(null);
      }
    } catch (error) {
      console.error('Errore eliminazione autore:', error);
    }
  }, [currentSession, loadLibrary, loadAuthors]);

  const handleDeleteOpera = useCallback(async (operaId) => {
    if (!confirm('Eliminare questa opera e tutti i suoi contenuti?')) return;
    try {
      await deleteOpera(operaId);
      await loadLibrary();
      await loadOperas();
      if (currentSession?.operaId === operaId) {
        setCurrentSession(null);
        saveCurrentSession(null);
      }
    } catch (error) {
      console.error('Errore eliminazione opera:', error);
    }
  }, [currentSession, loadLibrary, loadOperas]);

  const handleDeleteTrack = useCallback(async (trackId) => {
    if (!confirm('Eliminare questo brano e tutti i suoi take?')) return;
    try {
      await deleteTrack(trackId);
      await loadLibrary();
      await loadTracks();
      if (currentSession?.trackId === trackId) {
        setCurrentSession(null);
        saveCurrentSession(null);
      }
    } catch (error) {
      console.error('Errore eliminazione brano:', error);
    }
  }, [currentSession, loadLibrary, loadTracks]);

  const handleDeleteFragment = useCallback(async (fragmentId) => {
    if (!confirm('Eliminare questo frammento e tutti i suoi take?')) return;
    try {
      await deleteFragment(fragmentId);
      await loadLibrary();
      if (currentSession?.fragmentId === fragmentId) {
        setCurrentSession(prev => ({ ...prev, fragmentId: null, fragmentName: null }));
      }
    } catch (error) {
      console.error('Errore eliminazione frammento:', error);
    }
  }, [currentSession, loadLibrary]);

  // Editing functions
  const startEditing = useCallback((type, id, currentName) => {
    setEditingItem({ type, id });
    setEditingName(currentName);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingItem(null);
    setEditingName('');
  }, []);

  const saveEditing = useCallback(async () => {
    if (!editingItem || !editingName.trim()) {
      cancelEditing();
      return;
    }

    try {
      switch (editingItem.type) {
        case 'author':
          await renameAuthor(editingItem.id, editingName);
          await loadAuthors();
          if (currentSession?.authorId === editingItem.id) {
            setCurrentSession(prev => ({ ...prev, authorName: editingName }));
          }
          break;
        case 'opera':
          await renameOpera(editingItem.id, editingName);
          await loadOperas();
          if (currentSession?.operaId === editingItem.id) {
            setCurrentSession(prev => ({ ...prev, operaName: editingName }));
          }
          break;
        case 'track':
          await renameTrack(editingItem.id, editingName);
          await loadTracks();
          if (currentSession?.trackId === editingItem.id) {
            setCurrentSession(prev => ({ ...prev, trackName: editingName }));
          }
          break;
        case 'fragment':
          await renameFragment(editingItem.id, editingName);
          if (currentSession?.fragmentId === editingItem.id) {
            setCurrentSession(prev => ({ ...prev, fragmentName: editingName }));
          }
          break;
        case 'take':
          await renameTake(editingItem.id, editingName);
          break;
      }
      await loadLibrary();
    } catch (error) {
      console.error('Errore rinomina:', error);
    }
    cancelEditing();
  }, [editingItem, editingName, cancelEditing, currentSession, loadAuthors, loadOperas, loadTracks, loadLibrary]);

  // Select fragment as session
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

    // Update take count
    if (fragment?.id) {
      const takes = await getTakesByFragment(fragment.id);
      setTakeCount(takes.length);
    } else {
      const takes = await getTakesByTrack(track.id);
      const orphanTakes = takes.filter(t => !t.fragmentId);
      setTakeCount(orphanTakes.length);
    }

    if (closePicker) {
      setShowSessionPicker(false);
    }
  }, []);

  // Increment take count
  const incrementTakeCount = useCallback(() => {
    setTakeCount(prev => prev + 1);
  }, []);

  // Save a new take (supports incognito mode with no session)
  const saveNewTake = useCallback(async (videoBlob, mimeType, duration, isIncognito = false) => {
    // In incognito mode, save without session
    if (isIncognito) {
      try {
        const takeId = await saveTake(
          videoBlob,
          mimeType,
          null, // no trackId
          null, // no fragmentId
          duration,
          true // isIncognito flag
        );
        return takeId;
      } catch (error) {
        console.error('Errore salvataggio take incognito:', error);
        return null;
      }
    }

    // Normal mode requires a session
    if (!currentSession?.trackId) return null;

    try {
      const takeId = await saveTake(
        videoBlob,
        mimeType,
        currentSession.trackId,
        currentSession.fragmentId || null,
        duration,
        false // not incognito
      );
      incrementTakeCount();
      return takeId;
    } catch (error) {
      console.error('Errore salvataggio take:', error);
      return null;
    }
  }, [currentSession, incrementTakeCount]);

  const value = {
    // Session
    currentSession,
    setCurrentSession,
    showSessionPicker,
    setShowSessionPicker,
    takeCount,
    setTakeCount,
    incrementTakeCount,
    saveNewTake,

    // Library
    library,
    loadLibrary,
    authors,
    loadAuthors,
    operas,
    loadOperas,
    tracks,
    loadTracks,

    // Expanded state
    expandedAuthors,
    toggleAuthor,
    expandedOperas,
    toggleOpera,
    expandedTracks,
    toggleTrack,
    expandedFragments,
    toggleFragment,

    // Editing
    editingItem,
    editingName,
    setEditingName,
    startEditing,
    cancelEditing,
    saveEditing,

    // Delete handlers
    handleDeleteAuthor,
    handleDeleteOpera,
    handleDeleteTrack,
    handleDeleteFragment,

    // Session picker state
    newAuthorName,
    setNewAuthorName,
    newOperaName,
    setNewOperaName,
    newTrackName,
    setNewTrackName,
    newFragmentName,
    setNewFragmentName,
    selectedAuthorId,
    setSelectedAuthorId,
    selectedOperaId,
    setSelectedOperaId,
    selectedTrackId,
    setSelectedTrackId,

    // Select session
    selectFragmentAsSession,

    // DB functions exposed for components
    createAuthor,
    createOpera,
    createTrack,
    createFragment,
    deleteTake,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export default SessionContext;
