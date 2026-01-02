import React from 'react';
import { Video, FolderOpen, ListVideo, Settings } from 'lucide-react';

const tabs = [
  { id: 'registra', label: 'Registra', icon: Video },
  { id: 'takes', label: 'Take', icon: ListVideo },
  { id: 'libreria', label: 'Libreria', icon: FolderOpen },
  { id: 'impostazioni', label: 'Altro', icon: Settings },
];

export function BottomTabBar({ activeTab, onTabChange, hidden = false, isDark = true, isIncognito = false }) {
  if (hidden) return null;

  // In incognito mode, show minimal low-brightness tabs
  if (isIncognito) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-black border-t border-gray-900/50 safe-area-bottom">
        <div className="flex items-center justify-around h-16 opacity-20">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${
                  isActive ? 'text-gray-600' : 'text-gray-800'
                }`}
              >
                <Icon className="w-5 h-5 mb-1 stroke-[1.5]" />
                <span className="text-[10px] font-normal">{label}</span>
              </button>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    );
  }

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
