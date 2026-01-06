// Settings storage con persistenza localStorage

const SETTINGS_KEY = 'videoRecorderSettings';

export const DEFAULT_SETTINGS = {
  leftPedalKey: 'ArrowLeft',
  rightPedalKey: 'ArrowRight',
  audioFeedbackEnabled: true,
  videoQuality: '1080p', // '720p' | '1080p' | '4k'
  theme: 'dark', // 'dark' | 'light' | 'incognito'
  facingMode: 'user', // 'user' (front/selfie) | 'environment' (back/esterno)
  videoEnabled: false, // true = video, false = audio only
};

export const VIDEO_QUALITY_OPTIONS = {
  '720p': {
    label: '720p (HD)',
    width: 1280,
    height: 720,
    bitrate: 2000000
  },
  '1080p': {
    label: '1080p (Full HD)',
    width: 1920,
    height: 1080,
    bitrate: 4000000
  },
  '4k': {
    label: '4K (Ultra HD)',
    width: 3840,
    height: 2160,
    bitrate: 15000000
  },
};

export const loadSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge con default per gestire nuove impostazioni
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Errore caricamento impostazioni:', error);
  }
  return { ...DEFAULT_SETTINGS };
};

export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Errore salvataggio impostazioni:', error);
    return false;
  }
};

export const updateSetting = (key, value) => {
  const settings = loadSettings();
  settings[key] = value;
  saveSettings(settings);
  return settings;
};

export const resetSettings = () => {
  saveSettings(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS };
};
