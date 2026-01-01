import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, List, ChevronLeft, ChevronRight, Clock, Music, RefreshCw } from 'lucide-react';
import { getRecentSessions, searchRecentSessions } from '../../videoLibrary';

const SESSIONS_PER_PAGE = 20;

export function SessionsTab({ onSelectSession, isDark = true }) {
  const [viewMode, setViewMode] = useState('lista'); // 'calendario' | 'lista'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sessionsByDate, setSessionsByDate] = useState({});

  // Carica sessioni
  const loadSessions = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const offset = reset ? 0 : page * SESSIONS_PER_PAGE;
      let result;

      if (searchQuery.trim()) {
        result = await searchRecentSessions(searchQuery);
        setHasMore(false);
      } else {
        result = await getRecentSessions(SESSIONS_PER_PAGE, offset);
        setHasMore(result.length === SESSIONS_PER_PAGE);
      }

      if (reset) {
        setSessions(result);
        setPage(0);
      } else {
        setSessions(prev => [...prev, ...result]);
      }

      // Raggruppa per data per il calendario
      const byDate = {};
      result.forEach(entry => {
        const dateKey = new Date(entry.lastUsed).toISOString().split('T')[0];
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(entry);
      });
      setSessionsByDate(prev => reset ? byDate : { ...prev, ...byDate });

    } catch (error) {
      console.error('Errore caricamento sessioni:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    loadSessions(true);
  }, [searchQuery]);

  // Naviga mesi
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Genera griglia calendario
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Lunedì = 0

    const days = [];

    // Giorni vuoti prima
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, key: `empty-${i}` });
    }

    // Giorni del mese
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasSessions = sessionsByDate[dateKey]?.length > 0;
      const sessionCount = sessionsByDate[dateKey]?.length || 0;

      days.push({
        day,
        dateKey,
        hasSessions,
        sessionCount,
        key: dateKey,
      });
    }

    return days;
  };

  const formatTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Adesso';
    if (minutes < 60) return `${minutes} min fa`;
    if (hours < 24) return `${hours} ore fa`;
    if (days === 1) return 'Ieri';
    if (days < 7) return `${days} giorni fa`;
    return new Date(timestamp).toLocaleDateString('it-IT');
  };

  const handleSessionClick = (entry) => {
    if (onSelectSession) {
      onSelectSession(entry.session);
    }
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
    loadSessions(false);
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-gray-950' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex-shrink-0 p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Sessioni</h2>
          </div>

          {/* Toggle vista */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('lista')}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-colors ${
                viewMode === 'lista'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendario')}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-colors ${
                viewMode === 'calendario'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendario
            </button>
          </div>
        </div>

        {/* Ricerca */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca sessione..."
          className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Contenuto */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'calendario' ? (
          /* Vista Calendario */
          <div className="p-4">
            {/* Navigazione mese */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-2 text-gray-400 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-white font-medium">
                {currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={nextMonth}
                className="p-2 text-gray-400 hover:text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Intestazione giorni */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                <div key={day} className="text-center text-gray-500 text-xs py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Griglia giorni */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map(({ day, dateKey, hasSessions, sessionCount, key }) => (
                <div
                  key={key}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm ${
                    day === null
                      ? ''
                      : hasSessions
                        ? 'bg-blue-600/30 text-blue-300 cursor-pointer hover:bg-blue-600/50'
                        : 'text-gray-500'
                  }`}
                  onClick={() => {
                    if (hasSessions && sessionsByDate[dateKey]) {
                      // Mostra sessioni di quel giorno
                      setViewMode('lista');
                      // Potresti filtrare per quel giorno
                    }
                  }}
                >
                  {day && (
                    <>
                      <span>{day}</span>
                      {hasSessions && (
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-0.5" />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Vista Lista */
          <div className="p-4 space-y-2">
            {loading && sessions.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Nessuna sessione trovata</p>
                <p className="text-gray-600 text-sm mt-1">
                  Le sessioni appariranno qui dopo aver registrato
                </p>
              </div>
            ) : (
              <>
                {sessions.map((entry, index) => (
                  <button
                    key={entry.id || index}
                    onClick={() => handleSessionClick(entry)}
                    className="w-full bg-gray-800/50 hover:bg-gray-800 rounded-xl p-3 text-left transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {entry.session.trackName}
                        </p>
                        {entry.session.fragmentName && (
                          <p className="text-gray-400 text-sm truncate">
                            {entry.session.fragmentName}
                          </p>
                        )}
                        {(entry.session.authorName || entry.session.operaName) && (
                          <p className="text-gray-500 text-xs truncate mt-1">
                            {[entry.session.authorName, entry.session.operaName]
                              .filter(Boolean)
                              .join(' > ')}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end ml-3">
                        <span className="text-gray-400 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(entry.lastUsed)}
                        </span>
                        {entry.useCount > 1 && (
                          <span className="text-gray-500 text-xs mt-1">
                            {entry.useCount}x
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {/* Carica altri */}
                {hasMore && !searchQuery && (
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="w-full py-3 text-blue-400 text-sm hover:text-blue-300 disabled:text-gray-600"
                  >
                    {loading ? 'Caricamento...' : 'Carica altri'}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionsTab;
