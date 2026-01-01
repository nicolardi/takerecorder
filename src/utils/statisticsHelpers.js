import { initDB } from '../videoLibrary';

// Ottieni tutti i take con informazioni aggiuntive
export const getAllTakesWithInfo = async () => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['takes', 'tracks', 'operas', 'authors', 'fragments'], 'readonly');

    const takesRequest = tx.objectStore('takes').getAll();
    const tracksRequest = tx.objectStore('tracks').getAll();
    const operasRequest = tx.objectStore('operas').getAll();
    const authorsRequest = tx.objectStore('authors').getAll();
    const fragmentsRequest = tx.objectStore('fragments').getAll();

    tx.oncomplete = () => {
      const takes = takesRequest.result || [];
      const tracks = tracksRequest.result || [];
      const operas = operasRequest.result || [];
      const authors = authorsRequest.result || [];
      const fragments = fragmentsRequest.result || [];

      // Crea mappe per lookup veloce
      const trackMap = new Map(tracks.map(t => [t.id, t]));
      const operaMap = new Map(operas.map(o => [o.id, o]));
      const authorMap = new Map(authors.map(a => [a.id, a]));
      const fragmentMap = new Map(fragments.map(f => [f.id, f]));

      // Arricchisci i take con info aggiuntive
      const enrichedTakes = takes.map(take => {
        const fragment = take.fragmentId ? fragmentMap.get(take.fragmentId) : null;
        const track = trackMap.get(take.trackId);
        const opera = track?.operaId ? operaMap.get(track.operaId) : null;
        const author = opera?.authorId ? authorMap.get(opera.authorId) : null;

        return {
          ...take,
          trackName: track?.name || 'Sconosciuto',
          operaName: opera?.name || null,
          authorName: author?.name || null,
          fragmentName: fragment?.name || null,
        };
      });

      resolve(enrichedTakes);
    };

    tx.onerror = () => reject(tx.error);
  });
};

// Filtra per periodo
export const filterByPeriod = (takes, period) => {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  let cutoff;
  switch (period) {
    case 'ultimo-mese':
      cutoff = now - (30 * msPerDay);
      break;
    case 'ultimi-6-mesi':
      cutoff = now - (180 * msPerDay);
      break;
    case 'ultimo-anno':
      cutoff = now - (365 * msPerDay);
      break;
    case 'tutto':
    default:
      return takes;
  }

  return takes.filter(take => take.createdAt >= cutoff);
};

// Filtra per ricerca testuale
export const filterBySearch = (takes, query) => {
  if (!query || query.trim() === '') return takes;

  const lowerQuery = query.toLowerCase().trim();
  return takes.filter(take =>
    take.trackName?.toLowerCase().includes(lowerQuery) ||
    take.operaName?.toLowerCase().includes(lowerQuery) ||
    take.authorName?.toLowerCase().includes(lowerQuery) ||
    take.fragmentName?.toLowerCase().includes(lowerQuery)
  );
};

// Calcola statistiche di riepilogo
export const calculateSummary = (takes) => {
  const totalTakes = takes.length;
  const totalSeconds = takes.reduce((sum, t) => sum + (t.duration || 0), 0);
  const avgSeconds = totalTakes > 0 ? Math.round(totalSeconds / totalTakes) : 0;

  return {
    totalTakes,
    totalSeconds,
    avgSeconds,
    totalFormatted: formatDuration(totalSeconds),
    avgFormatted: formatDuration(avgSeconds),
  };
};

// Formatta durata in Xh Ym o M:SS
export const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Raggruppa per data (per grafico lineare)
export const groupByDate = (takes) => {
  const groups = {};

  takes.forEach(take => {
    const date = new Date(take.createdAt);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: dateKey,
        takes: 0,
        totalSeconds: 0,
      };
    }
    groups[dateKey].takes++;
    groups[dateKey].totalSeconds += take.duration || 0;
  });

  // Ordina per data
  return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
};

// Raggruppa per brano (per bar chart)
export const groupByTrack = (takes) => {
  const groups = {};

  takes.forEach(take => {
    const trackName = take.trackName || 'Sconosciuto';

    if (!groups[trackName]) {
      groups[trackName] = {
        trackName,
        takes: 0,
        totalSeconds: 0,
      };
    }
    groups[trackName].takes++;
    groups[trackName].totalSeconds += take.duration || 0;
  });

  // Ordina per numero di take decrescente
  return Object.values(groups).sort((a, b) => b.takes - a.takes);
};

// Aggregazione per mese (per grafici a lungo termine)
export const groupByMonth = (takes) => {
  const groups = {};

  takes.forEach(take => {
    const date = new Date(take.createdAt);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

    if (!groups[monthKey]) {
      groups[monthKey] = {
        month: monthKey,
        label: new Date(date.getFullYear(), date.getMonth(), 1)
          .toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }),
        takes: 0,
        totalSeconds: 0,
      };
    }
    groups[monthKey].takes++;
    groups[monthKey].totalSeconds += take.duration || 0;
  });

  return Object.values(groups).sort((a, b) => a.month.localeCompare(b.month));
};

// Prepara dati per grafico lineare (ore nel tempo)
export const prepareLineChartData = (takes, period) => {
  // Usa raggruppamento per giorno o per mese in base al periodo
  const useMonthly = period === 'ultimo-anno' || period === 'tutto';
  const grouped = useMonthly ? groupByMonth(takes) : groupByDate(takes);

  return {
    labels: grouped.map(g => useMonthly ? g.label : formatDateLabel(g.date)),
    datasets: [{
      label: 'Ore di registrazione',
      data: grouped.map(g => Math.round(g.totalSeconds / 3600 * 100) / 100), // Ore con 2 decimali
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.3,
    }]
  };
};

// Prepara dati per bar chart (takes per brano)
export const prepareBarChartData = (takes, limit = 10) => {
  const grouped = groupByTrack(takes).slice(0, limit);

  return {
    labels: grouped.map(g => truncateLabel(g.trackName, 15)),
    datasets: [{
      label: 'Numero di take',
      data: grouped.map(g => g.takes),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1,
    }]
  };
};

// Helper: formatta data per label
const formatDateLabel = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
};

// Helper: tronca label troppo lunghe
const truncateLabel = (label, maxLength) => {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength - 1) + '…';
};

// Ottieni tabella riepilogo per brano
export const getTrackSummaryTable = (takes) => {
  const grouped = groupByTrack(takes);

  return grouped.map(g => ({
    trackName: g.trackName,
    takes: g.takes,
    duration: formatDuration(g.totalSeconds),
    totalSeconds: g.totalSeconds,
  }));
};
