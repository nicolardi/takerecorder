import React from 'react';
import { Video, FolderOpen, Calendar, BarChart3, Settings } from 'lucide-react';

const tabs = [
  { id: 'registra', label: 'Registra', icon: Video },
  { id: 'sessioni', label: 'Sessioni', icon: Calendar },
  { id: 'libreria', label: 'Libreria', icon: FolderOpen },
  { id: 'statistiche', label: 'Statistiche', icon: BarChart3 },
  { id: 'impostazioni', label: 'Altro', icon: Settings },
];

export function BottomTabBar({ activeTab, onTabChange, hidden = false, isDark = true }) {
  if (hidden) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-lg border-t safe-area-bottom ${
      isDark ? 'bg-gray-900/95 border-gray-700' : 'bg-white/95 border-gray-200'
    }`}>
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${
                isActive
                  ? 'text-blue-500'
                  : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon
                className={`w-6 h-6 mb-1 ${
                  isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'
                }`}
              />
              <span
                className={`text-xs ${
                  isActive ? 'font-semibold' : 'font-normal'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Padding extra per safe area iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}

export default BottomTabBar;
