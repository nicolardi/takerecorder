import React from 'react';
import { Settings, Keyboard, Volume2 } from 'lucide-react';
import { VIDEO_QUALITY_OPTIONS } from '../../utils/settingsStorage';

// Funzione helper per mostrare nome tasto leggibile
const getKeyDisplayName = (key) => {
  const keyNames = {
    'ArrowLeft': '← Freccia SX',
    'ArrowRight': '→ Freccia DX',
    'ArrowUp': '↑ Freccia SU',
    'ArrowDown': '↓ Freccia GIU',
    'Space': 'Spazio',
    'Enter': 'Invio',
    'PageUp': 'Pag ↑',
    'PageDown': 'Pag ↓',
  };
  return keyNames[key] || key;
};

export function SettingsTab({
  isDark = true,
  settings,
  updateSetting,
  leftPedalKey,
  rightPedalKey,
  isListeningForKey,
  setIsListeningForKey,
  audioFeedbackEnabled,
  setAudioFeedbackEnabled,
}) {
  return (
    <div className={`h-full overflow-y-auto p-4 ${isDark ? 'bg-gray-950' : 'bg-white'}`}>
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-gray-400" />
        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Impostazioni</h2>
      </div>

      {/* Pedali */}
      <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
        <h3 className={`font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Keyboard className="w-4 h-4 text-gray-400" />
          Pedali USB / Tastiera
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pedale sinistro (Rec)</span>
            <button
              onClick={() => setIsListeningForKey('left')}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                isListeningForKey === 'left'
                  ? 'bg-yellow-600 text-white animate-pulse'
                  : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {isListeningForKey === 'left' ? 'Premi...' : getKeyDisplayName(leftPedalKey)}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pedale destro (Play)</span>
            <button
              onClick={() => setIsListeningForKey('right')}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                isListeningForKey === 'right'
                  ? 'bg-yellow-600 text-white animate-pulse'
                  : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {isListeningForKey === 'right' ? 'Premi...' : getKeyDisplayName(rightPedalKey)}
            </button>
          </div>
        </div>
      </div>

      {/* Audio Feedback */}
      <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <span className={isDark ? 'text-white' : 'text-gray-900'}>Feedback audio</span>
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

      {/* Qualita Video */}
      <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
        <h3 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Qualita Video</h3>
        <div className="space-y-2">
          {Object.entries(VIDEO_QUALITY_OPTIONS).map(([key, opt]) => (
            <button
              key={key}
              onClick={() => updateSetting('videoQuality', key)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                settings.videoQuality === key
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tema */}
      <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
        <div className="flex items-center justify-between">
          <span className={isDark ? 'text-white' : 'text-gray-900'}>Tema scuro</span>
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
  );
}

export default SettingsTab;
