import React, { useState, useEffect, useCallback } from 'react';
import { Video, Play, Clock, CheckCircle, RefreshCw, ChevronDown, EyeOff, Mic, X, Tag, Search } from 'lucide-react';
import { getAllTakesWithDetails, getTotalTakesCount, deleteTake, getRecentSessions, assignTrackToTake } from '../../videoLibrary';
import { formatTakeDuration } from '../../utils/formatters';

const TAKES_PER_PAGE = 20;

// Raggruppa take per periodo
const groupTakesByPeriod = (takes) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const thisWeekStart = new Date(today.getTime() - today.getDay() * 86400000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisYearStart = new Date(now.getFullYear(), 0, 1);

  const groups = {
    today: { label: 'Oggi', takes: [] },
    yesterday: { label: 'Ieri', takes: [] },
    thisWeek: { label: 'Questa settimana', takes: [] },
    thisMonth: { label: 'Questo mese', takes: [] },
    thisYear: { label: "Quest'anno", takes: [] },
    older: { label: 'Precedenti', takes: [] },
  };

  takes.forEach(take => {
    const takeDate = new Date(take.createdAt);

    if (takeDate >= today) {
      groups.today.takes.push(take);
    } else if (takeDate >= yesterday) {
      groups.yesterday.takes.push(take);
    } else if (takeDate >= thisWeekStart) {
      groups.thisWeek.takes.push(take);
    } else if (takeDate >= thisMonthStart) {
      groups.thisMonth.takes.push(take);
    } else if (takeDate >= thisYearStart) {
      groups.thisYear.takes.push(take);
    } else {
      groups.older.takes.push(take);
    }
  });

  return groups;
};

// Formatta data/ora
const formatDateTime = (timestamp) => {
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function SessionsTab({ onSelectSession, onPlayTake, isDark = true }) {
  const [takes, setTakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState({
    today: true,
    yesterday: true,
    thisWeek: true,
    thisMonth: false,
    thisYear: false,
    older: false,
  });
  // State per assegnazione brano
  const [trackPickerTakeId, setTrackPickerTakeId] = useState(null);
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const [recentTracks, setRecentTracks] = useState([]);
  const [trackPickerLoading, setTrackPickerLoading] = useState(false);
  const [trackSearchFilter, setTrackSearchFilter] = useState('');

  // Carica take
  const loadTakes = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const offset = reset ? 0 : page * TAKES_PER_PAGE;
      const result = await getAllTakesWithDetails(TAKES_PER_PAGE, offset);
      const count = await getTotalTakesCount();

      setTotalCount(count);
      setHasMore(offset + result.length < count);

      if (reset) {
        setTakes(result);
        setPage(0);
      } else {
        setTakes(prev => [...prev, ...result]);
      }
    } catch (error) {
      console.error('Errore caricamento take:', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadTakes(true);
  }, []);

  const loadMore = () => {
    const newPage = page + 1;
    setPage(newPage);
    getAllTakesWithDetails(TAKES_PER_PAGE, newPage * TAKES_PER_PAGE)
      .then(result => {
        setTakes(prev => [...prev, ...result]);
        setHasMore((newPage + 1) * TAKES_PER_PAGE < totalCount);
      });
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // Seleziona sessione dal take
  const handleSelectSession = (take) => {
    if (!take.sessionDetails.trackId) {
      // Take incognito senza sessione
      return;
    }

    const session = {
      trackId: take.sessionDetails.trackId,
      trackName: take.sessionDetails.trackName,
      fragmentId: take.sessionDetails.fragmentId,
      fragmentName: take.sessionDetails.fragmentName,
      operaId: take.sessionDetails.operaId,
      operaName: take.sessionDetails.operaName,
      authorId: take.sessionDetails.authorId,
      authorName: take.sessionDetails.authorName,
    };

    if (onSelectSession) {
      onSelectSession(session);
    }
  };

  // Riproduci take
  const handlePlayTake = (take) => {
    if (onPlayTake) {
      const url = URL.createObjectURL(take.videoBlob);
      onPlayTake({
        url,
        mimeType: take.mimeType,
        id: take.id,
        videoBlob: take.videoBlob,
        duration: take.duration,
        isIncognito: take.isIncognito,
        sessionDetails: take.sessionDetails,
        // Callbacks per azioni dalla modale
        onTag: () => openTrackPicker(take),
        onShare: () => handleShareTake(take),
      });
    }
  };

  // Condividi take
  const handleShareTake = async (take) => {
    try {
      const extension = take.mimeType?.includes('video') ? 'webm' : 'webm';
      const filename = `take_${Date.now()}.${extension}`;
      const file = new File([take.videoBlob], filename, { type: take.mimeType });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Take registrato' });
      } else {
        const url = URL.createObjectURL(take.videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Errore condivisione:', error);
    }
  };

  // Chiudi picker brani
  const closeTrackPicker = () => {
    setTrackPickerTakeId(null);
    setShowTrackPicker(false);
    setTrackSearchFilter('');
  };

  // Apri picker brani
  const openTrackPicker = async (take) => {
    setTrackPickerTakeId(take.id);
    setShowTrackPicker(true);
    setTrackPickerLoading(true);
    try {
      const sessions = await getRecentSessions(20, 0);
      setRecentTracks(sessions);
    } catch (error) {
      console.error('Errore caricamento brani:', error);
    }
    setTrackPickerLoading(false);
  };

  // Assegna brano al take
  const assignTrackToCurrentTake = async (session) => {
    if (!trackPickerTakeId) return;
    try {
      await assignTrackToTake(trackPickerTakeId, session.trackId, session.fragmentId || null);
      // Ricarica i take per aggiornare la lista
      await loadTakes(true);
    } catch (error) {
      console.error('Errore assegnazione brano:', error);
    }
    setTrackPickerTakeId(null);
    setShowTrackPicker(false);
  };

  // Costruisci descrizione brano per il picker (ordine naturale: dal più specifico al più generale)
  // Es: "Prima pagina del Primo movimento del Concerto n.2 di Beethoven"
  const getTrackDescription = (session) => {
    const parts = [];

    // Frammento (più specifico)
    if (session.fragmentName) {
      parts.push(session.fragmentName);
    }

    // Brano
    if (session.trackName) {
      if (parts.length > 0) {
        parts.push(`del ${session.trackName}`);
      } else {
        parts.push(session.trackName);
      }
    }

    // Opera
    if (session.operaName) {
      if (parts.length > 0) {
        parts.push(`del ${session.operaName}`);
      } else {
        parts.push(session.operaName);
      }
    }

    // Autore (più generale)
    if (session.authorName) {
      if (parts.length > 0) {
        parts.push(`di ${session.authorName}`);
      } else {
        parts.push(session.authorName);
      }
    }

    return parts.join(' ') || 'Brano senza nome';
  };

  // Filtra brani in base alla ricerca (cerca in tutti i livelli)
  const filteredTracks = recentTracks.filter((entry) => {
    if (!trackSearchFilter.trim()) return true;
    const searchLower = trackSearchFilter.toLowerCase().trim();
    const session = entry.session;
    // Cerca in tutti i campi: autore, opera, brano, frammento
    return (
      (session.authorName && session.authorName.toLowerCase().includes(searchLower)) ||
      (session.operaName && session.operaName.toLowerCase().includes(searchLower)) ||
      (session.trackName && session.trackName.toLowerCase().includes(searchLower)) ||
      (session.fragmentName && session.fragmentName.toLowerCase().includes(searchLower))
    );
  });

  const groupedTakes = groupTakesByPeriod(takes);

  // Costruisci descrizione sessione (ordine naturale: dal più specifico al più generale)
  const getSessionDescription = (take) => {
    // Se ha un nome custom, mostralo
    if (take.name) {
      return take.name;
    }

    // Se è esplicitamente marcato come incognito
    if (take.isIncognito === true) {
      // Se ha anche un brano associato, mostralo
      if (take.sessionDetails?.trackId) {
        return getTrackDescription(take.sessionDetails);
      }
      return 'Registrazione incognito';
    }

    // Se non ha brano associato (ma non è incognito)
    if (!take.sessionDetails?.trackId) {
      return 'Senza brano';
    }

    return getTrackDescription(take.sessionDetails);
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-gray-950' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex-shrink-0 p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-400" />
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Registrazioni
            </h2>
            {totalCount > 0 && (
              <span className="text-gray-500 text-sm">({totalCount})</span>
            )}
          </div>

          <button
            onClick={() => loadTakes(true)}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Contenuto */}
      <div className="flex-1 overflow-y-auto">
        {loading && takes.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
          </div>
        ) : takes.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nessuna registrazione</p>
            <p className="text-gray-600 text-sm mt-1">
              Le registrazioni appariranno qui
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {Object.entries(groupedTakes).map(([key, group]) => {
              if (group.takes.length === 0) return null;

              const isExpanded = expandedGroups[key];

              return (
                <div key={key}>
                  {/* Header gruppo */}
                  <button
                    onClick={() => toggleGroup(key)}
                    className="w-full flex items-center justify-between py-2 text-left"
                  >
                    <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {group.label}
                      <span className="text-gray-500 text-sm ml-2">({group.takes.length})</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Take del gruppo */}
                  {isExpanded && (
                    <div className="space-y-2">
                      {group.takes.map((take) => (
                        <div
                          key={take.id}
                          className={`rounded-xl p-3 ${isDark ? 'bg-gray-800/50' : 'bg-gray-100'}`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icona tipo (video/audio) con badge incognito */}
                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center relative ${
                              take.mimeType?.includes('video') ? 'bg-blue-900/50' : 'bg-orange-900/50'
                            }`}>
                              {take.mimeType?.includes('video') ? (
                                <Video className="w-5 h-5 text-blue-400" />
                              ) : (
                                <Mic className="w-5 h-5 text-orange-400" />
                              )}
                              {take.isIncognito === true && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                                  <EyeOff className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {getSessionDescription(take)}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-gray-500 text-xs flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDateTime(take.createdAt)}
                                </span>
                                {take.duration > 0 && (
                                  <span className="text-blue-400 text-xs">
                                    {formatTakeDuration(take.duration)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Azioni */}
                            <div className="flex items-center gap-1">
                              {/* Seleziona brano (solo se ha un brano associato) */}
                              {take.sessionDetails.trackId && (
                                <button
                                  onClick={() => handleSelectSession(take)}
                                  className="p-2 text-gray-400 hover:text-green-400 active:bg-gray-700 rounded-lg"
                                  title="Seleziona questo brano"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}

                              {/* Play - apre modale con tutte le azioni */}
                              <button
                                onClick={() => handlePlayTake(take)}
                                className="p-2 text-gray-400 hover:text-blue-400 active:bg-gray-700 rounded-lg"
                                title="Riproduci"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Carica altri */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-3 text-blue-400 text-sm hover:text-blue-300 disabled:text-gray-600"
              >
                {loading ? 'Caricamento...' : 'Carica altri'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modale selezione brano - Full Screen */}
      {showTrackPicker && (
        <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-800 safe-area-top">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-orange-400" />
              <h3 className="text-white font-medium text-lg">Assegna brano</h3>
            </div>
            <button
              onClick={closeTrackPicker}
              className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Campo ricerca */}
          <div className="flex-shrink-0 p-4 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={trackSearchFilter}
                onChange={(e) => setTrackSearchFilter(e.target.value)}
                placeholder="Cerca autore, opera, brano..."
                className="w-full bg-gray-800 text-white text-base pl-11 pr-10 py-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500"
                autoFocus
              />
              {trackSearchFilter && (
                <button
                  onClick={() => setTrackSearchFilter('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Lista brani */}
          <div className="flex-1 overflow-y-auto p-4 pb-[env(safe-area-inset-bottom)]">
            {trackPickerLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-gray-500 animate-spin" />
              </div>
            ) : recentTracks.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Nessun brano disponibile</p>
                <p className="text-gray-600 text-sm mt-1">
                  Crea prima un brano dalla schermata di registrazione
                </p>
              </div>
            ) : filteredTracks.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Nessun risultato per "{trackSearchFilter}"</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTracks.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => assignTrackToCurrentTake(entry.session)}
                    className="w-full text-left p-4 rounded-xl bg-gray-800 hover:bg-gray-700 active:bg-gray-600 transition-colors"
                  >
                    <p className="text-white text-base">
                      {getTrackDescription(entry.session)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionsTab;
