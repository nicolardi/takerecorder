import React from 'react';
import { Play } from 'lucide-react';

// Formatta timestamp in formato leggibile
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
};

// Formatta durata in M:SS
const formatTakeDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function TakeItem({
  take,
  index,
  parentName,
  onPlay,
}) {
  const takeName = take.name || `Take ${index + 1}`;

  return (
    <div className="flex items-center justify-between p-2 bg-blue-900/20 rounded-lg">
      <button
        onClick={() => onPlay(take, index, parentName)}
        className="flex-1 flex items-center gap-2"
      >
        <Play className="w-4 h-4 text-white" />
        <span className="text-white text-xs">{takeName}</span>
        {take.duration > 0 && (
          <span className="text-blue-400 text-xs">{formatTakeDuration(take.duration)}</span>
        )}
        <span className="text-gray-400 text-xs">{formatTime(take.createdAt)}</span>
      </button>
    </div>
  );
}

export default TakeItem;
