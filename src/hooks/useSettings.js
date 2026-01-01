import { useState, useEffect, useCallback } from 'react';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../utils/settingsStorage';

export function useSettings() {
  const [settings, setSettings] = useState(() => loadSettings());

  // Salva automaticamente quando cambiano le impostazioni
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const updateMultipleSettings = useCallback((updates) => {
    setSettings(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return {
    settings,
    updateSetting,
    updateMultipleSettings,
    resetSettings
  };
}
