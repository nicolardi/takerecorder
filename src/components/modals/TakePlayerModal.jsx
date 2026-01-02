import React from 'react';
import { X, Share2, Trash2, Mic, Tag } from 'lucide-react';

export function TakePlayerModal({
  playingTake,
  onClose,
  onShare,
  onDelete,
  onTag,
}) {
  if (!playingTake) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      onClick={onClose}
    >
      {/* Header con info e pulsante chiudi */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium text-lg">
              {playingTake.isIncognito
                ? 'Registrazione incognito'
                : playingTake.index !== undefined
                  ? `Take ${playingTake.index + 1}`
                  : 'Take'}
            </p>
            <p className="text-gray-400 text-sm">
              {playingTake.fragmentName || playingTake.sessionDetails?.trackName || ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"
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

      {/* Footer con azioni */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))]">
        <div className="flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
          {/* Tag/Cambia brano */}
          {onTag && (
            <button
              onClick={onTag}
              className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-orange-600 active:bg-orange-500"
            >
              <Tag className="w-7 h-7 text-white" />
              <span className="text-white text-sm font-medium">Brano</span>
            </button>
          )}

          {/* Condividi */}
          <button
            onClick={onShare}
            className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-purple-600 active:bg-purple-500"
          >
            <Share2 className="w-7 h-7 text-white" />
            <span className="text-white text-sm font-medium">Condividi</span>
          </button>

          {/* Elimina */}
          <button
            onClick={onDelete}
            className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-red-600 active:bg-red-500"
          >
            <Trash2 className="w-7 h-7 text-white" />
            <span className="text-white text-sm font-medium">Elimina</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default TakePlayerModal;
