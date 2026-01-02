// Formatta timestamp in formato leggibile (oggi: ora, altrimenti: data)
export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
};

// Formatta durata in M:SS
export const formatTakeDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Formatta tempo trascorso (es. "5m fa", "2h fa", "Ieri")
export const formatTimeAgo = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Ora';
  if (minutes < 60) return `${minutes}m fa`;
  if (hours < 24) return `${hours}h fa`;
  if (days === 1) return 'Ieri';
  if (days < 7) return `${days}g fa`;
  return new Date(timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
};

// Conta takes ricorsivamente in una struttura gerarchica
export const countTotalTakes = (item) => {
  if (item.takes) return item.takes.length;
  if (item.fragments) {
    let count = item.orphanTakes?.length || 0;
    for (const fragment of item.fragments) {
      count += fragment.takes?.length || 0;
    }
    return count;
  }
  if (item.tracks) {
    let count = 0;
    for (const track of item.tracks) {
      count += countTotalTakes(track);
    }
    return count;
  }
  if (item.operas) {
    let count = 0;
    for (const opera of item.operas) {
      count += countTotalTakes(opera);
    }
    return count;
  }
  return 0;
};
