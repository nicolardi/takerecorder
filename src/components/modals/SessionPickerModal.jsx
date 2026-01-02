import React, { useState, useEffect, useCallback } from 'react';
import { X, Music, HelpCircle, User, BookOpen, FolderOpen, FileText, Plus } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { getRecentSessions, searchRecentSessions, createFragment as dbCreateFragment } from '../../videoLibrary';
import { formatTimeAgo } from '../../utils/formatters';

const RECENT_SESSIONS_PAGE_SIZE = 10;

export function SessionPickerModal({ onClose, onPlayTake }) {
  const {
    currentSession,
    showSessionPicker,
    setShowSessionPicker,
    library,
    loadLibrary,
    authors,
    loadAuthors,
    operas,
    loadOperas,
    tracks,
    loadTracks,
    expandedAuthors,
    toggleAuthor,
    expandedOperas,
    toggleOpera,
    expandedTracks,
    toggleTrack,
    expandedFragments,
    toggleFragment,
    editingItem,
    editingName,
    setEditingName,
    startEditing,
    cancelEditing,
    saveEditing,
    handleDeleteAuthor,
    handleDeleteOpera,
    handleDeleteTrack,
    handleDeleteFragment,
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
    selectFragmentAsSession,
    createAuthor,
    createOpera,
    createTrack,
    createFragment,
  } = useSession();

  const [sessionPickerTab, setSessionPickerTab] = useState('recenti');
  const [showHelp, setShowHelp] = useState(false);
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentSessionsLoading, setRecentSessionsLoading] = useState(false);
  const [recentSessionsSearch, setRecentSessionsSearch] = useState('');
  const [recentSessionsPage, setRecentSessionsPage] = useState(0);
  const [hasMoreRecent, setHasMoreRecent] = useState(true);

  // Load initial data
  useEffect(() => {
    loadLibrary();
    loadAuthors();
    loadOperas();
    loadTracks();
    loadRecentSessionsData(true);
  }, []);

  const loadRecentSessionsData = useCallback(async (reset = false) => {
    setRecentSessionsLoading(true);
    try {
      const page = reset ? 0 : recentSessionsPage;
      const sessions = await getRecentSessions(RECENT_SESSIONS_PAGE_SIZE, page * RECENT_SESSIONS_PAGE_SIZE);

      if (reset) {
        setRecentSessions(sessions);
        setRecentSessionsPage(1);
      } else {
        setRecentSessions(prev => [...prev, ...sessions]);
        setRecentSessionsPage(prev => prev + 1);
      }
      setHasMoreRecent(sessions.length === RECENT_SESSIONS_PAGE_SIZE);
    } catch (error) {
      console.error('Errore caricamento sessioni recenti:', error);
    } finally {
      setRecentSessionsLoading(false);
    }
  }, [recentSessionsPage]);

  const handleRecentSessionsSearch = useCallback(async (query) => {
    setRecentSessionsSearch(query);
    if (query.trim()) {
      setRecentSessionsLoading(true);
      try {
        const results = await searchRecentSessions(query);
        setRecentSessions(results);
        setHasMoreRecent(false);
      } catch (error) {
        console.error('Errore ricerca sessioni:', error);
      } finally {
        setRecentSessionsLoading(false);
      }
    } else {
      loadRecentSessionsData(true);
    }
  }, [loadRecentSessionsData]);

  const handleCreateAuthor = useCallback(async (name) => {
    try {
      const id = await createAuthor(name);
      await loadAuthors();
      setSelectedAuthorId(id);
    } catch (error) {
      console.error('Errore creazione autore:', error);
    }
  }, [createAuthor, loadAuthors, setSelectedAuthorId]);

  const handleCreateOpera = useCallback(async (authorId, name) => {
    try {
      const id = await createOpera(authorId, name);
      await loadOperas();
      setSelectedOperaId(id);
    } catch (error) {
      console.error('Errore creazione opera:', error);
    }
  }, [createOpera, loadOperas, setSelectedOperaId]);

  const handleCreateTrack = useCallback(async (operaId, name) => {
    try {
      const id = await createTrack(operaId, name);
      await loadTracks();
      setSelectedTrackId(id);
    } catch (error) {
      console.error('Errore creazione brano:', error);
    }
  }, [createTrack, loadTracks, setSelectedTrackId]);

  const handleCreateFragment = useCallback(async (trackId, trackName, operaId, operaName, authorId, authorName) => {
    if (!newFragmentName.trim()) return;
    try {
      const fragmentId = await dbCreateFragment(trackId, newFragmentName.trim());
      await loadLibrary();
      setNewFragmentName('');

      // Select the new fragment as session
      selectFragmentAsSession(
        { id: fragmentId, name: newFragmentName.trim() },
        { id: trackId, name: trackName },
        operaId ? { id: operaId, name: operaName } : null,
        authorId ? { id: authorId, name: authorName } : null
      );
    } catch (error) {
      console.error('Errore creazione frammento:', error);
    }
  }, [newFragmentName, loadLibrary, selectFragmentAsSession, setNewFragmentName]);

  const selectTrackAsSession = useCallback((track, opera, author) => {
    selectFragmentAsSession(
      null,
      track,
      opera,
      author
    );
  }, [selectFragmentAsSession]);

  const handleClose = () => {
    if (currentSession) {
      setShowSessionPicker(false);
      if (onClose) onClose();
    }
  };

  if (!showSessionPicker) return null;

  return (
    <div
      className="absolute inset-0 z-50 bg-black/95 flex flex-col pt-4 px-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && currentSession) {
          handleClose();
        }
      }}
    >
      <div className="bg-gray-900 rounded-2xl p-5 max-w-sm w-full mx-auto relative">
        {currentSession && (
          <button
            onClick={handleClose}
            className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg active:bg-red-700"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        )}

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-400" />
            <h2 className="text-white text-sm font-semibold">Seleziona Brano</h2>
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
            Crea Nuovo
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
              placeholder="Cerca brano..."
              className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
            />

            {/* Lista brani recenti */}
            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {recentSessions.length === 0 && !recentSessionsLoading ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  Nessun brano recente
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
                          false
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
              Seleziona un brano per iniziare a registrare
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionPickerModal;
